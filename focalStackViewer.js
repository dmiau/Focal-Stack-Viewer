//---------------------
// focal stack viewer constructor 
//---------------------
function focalStackViewer(viewer_div_obj, mode, data_obj){
    // Input: data_obj, which contains the information of focal stack dataset
    // 
    // Here is the layout of data_obj:
    // src_dir
    // frame_number
    // depth_map
    // title
    //
    // frames are named in the following manner (1 based index):
    // frame1.jpg, frame2.jpg, frame3.jpg,...	        

    //--------------------
    // Class properties
    //--------------------
    this.viewer_jquery_obj = $(viewer_div_obj);
    this.data_obj = data_obj;
    this.anchor_div_obj = this.viewer_jquery_obj.children('#anchor');
    this.mode = mode;
    this.width = 0; //TBD by the first frame
    this.height = 0; //TBD by the first frame
    this.delay_time = 1;
    this.cur_idx = 1; //store the index of the current displayed frame
    this.step = 0;
    this.remain = 0;
    this.img_objs = [];

    //--------------------
    // Viewer HTML structure
    // <div id="focusViewer">
    // 	<img id="focusViewer_loading">
    //  <div id = "anchor">
    // 	// canvas or img (use class because class can be easily removed)
    // 	<canvas class="activeLayer">   or <img class="activeLayer">      
    //  </div>
    // </div>
    //--------------------
    this.initViewer();
}

//--------------------
// Load new dataset
//--------------------
focalStackViewer.prototype.switchDataset = function(data_obj){
    this.data_obj = data_obj;
    this.width = 0; 
    this.height = 0;
    this.delay_time = 1;
    this.cur_idx = 1; //store the index of the current displayed frame
    this.step = 0;
    this.remain = 0;
    this.img_objs = [];

    // VERY IMPORTANT!!!! 
    // need to unbind the click action and bind it again with the new object later
    // otherwise the code will have funny behavior
    this.viewer_jquery_obj.unbind('click');
    // remove all children of anchor
    //http://stackoverflow.com/questions/683366/remove-all-the-children-dom-elements-in-div
    while (this.anchor_div_obj[0].hasChildNodes()) {
    	this.anchor_div_obj[0].removeChild(this.anchor_div_obj[0].lastChild);
    }

    var canvas = document.getElementById('focusViewer_Canvas');
    var context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);

    this.data_obj = data_obj;
    this.initViewer();
}

//--------------------
// Viewer initialization
//--------------------
focalStackViewer.prototype.initViewer = function(){

    // update dataset title
    $('#dataTitle').html(this.data_obj.title);

    // alert if depth_map is unspecified/empty
    if (this.data_obj.depth_map == ""){
	alert("Error: depth map is unspecified!"); //TODO: adjust warning level
	return false;
    }

    //load the depth map to decide the canvas size
    var depth_img = new Image();
    depth_img.src = this.data_obj.src_dir + this.data_obj.depth_map;
    var viewer_obj = this;

    // This part is slightly tricky.
    // onload is called only after the entire file is parsed?
    depth_img.onload = function(){
	viewer_obj.width = depth_img.width;
	viewer_obj.height = depth_img.height;

	$('.focusViewer_frame').attr('height', depth_img.height);
	$('.focusViewer_frame').attr('width', depth_img.width);

	// update the progress bar location as well (don't have a good way to center the progress bar)
	$('#focusViewer_loading').css('top', Math.round(depth_img.height/2));
	$('#focusViewer_loading').css('left', Math.round(depth_img.width/2) - 110);
	$('#focusViewer_loading').show();

	// store the depth in a hidden canvas
	var canvas = document.getElementById('focusViewer_Canvas');
	canvas.width = depth_img.width;
	canvas.height = depth_img.height;
	var context = canvas.getContext('2d');
	context.drawImage(depth_img, 0, 0);

	viewer_obj.initMode();
    }
}

//--------------------
// Mode initialization
//--------------------
focalStackViewer.prototype.initMode = function(){
    switch(this.mode){
    case 'single_canvas':
	this.anchor_div_obj.append('<canvas class = "activeLayer"> </canvas>');
	var canvas = this.anchor_div_obj.children('.activeLayer');
	canvas = canvas[0]; //TODO: should only have one
	canvas.width = this.width;
	canvas.height = this.height;
	var context = canvas.getContext("2d"); //there should only be one object
	var first_img = new Image();
	first_img.onload = function(){
	    context.drawImage(first_img, 0, 0);
	};
	first_img.src = this.data_obj.src_dir + 'frame1.jpg';
	break;
    case 'single_img':
	this.anchor_div_obj
	    .append('<img class = "activeLayer" src="' + 
		    this.data_obj.src_dir + 'frame1.jpg' + '">');
	break;
	// case 'multi_img':
	// 	this.anchor_div_obj
	// 	    .append('<img id="frame1" class = "activeLayer" src="' + 
	// 		    this.data_obj.src_dir + 'frame1.jpg' + '">');	
	// 	break;
    default:
	//error handling
	alert('Unknown mode: ' + this.mode);
    }

    //-------------------------
    // Preloading all the images
    //-------------------------
    var viewer = this;
    this.preloadImages(this.data_obj).done(function(){
	$('#focusViewer_loading').hide();
	
	//-----------------------------------
	// bind the click event to an anonymous function 
	// after stack preloading is completed
	//-----------------------------------
	viewer.viewer_jquery_obj.click(
	    //viewer.clickFun
	    $.proxy(viewer.clickFun, viewer)
	);
	//this.firstInitFlag = false;
	// switch(viewer.mode){
	// case 'multi_img':
	//     //
	//     break;
	// }
    });

}

//--------------------
// Click
//--------------------
focalStackViewer.prototype.clickFun = function(event){
    var layerIdx = this.getFocalStackIndex(event, this.viewer_jquery_obj);

    //============================================
    // new transition code
    //============================================
    if(layerIdx >0 && layerIdx <= this.data_obj.frame_number) {
	// only perform transition of the two indices are different
	if (this.cur_idx != layerIdx){
	    this.remain = Math.abs(this.cur_idx - layerIdx);
	    if (layerIdx > this.cur_idx){
		this.step = 1;
	    }else{
		this.step = -1;
	    }
	    // console.log("===============");
	    // console.log("sIdx: %d", sIdx);
	    // console.log("eIdx: %d", eIdx);
	    // console.log("===============");

	    //transition happens here
	    switch(this.mode){
	    case 'single_canvas':
		this.canvasUpdateFun();
		break;
	    case 'single_img':
		this.imgUpdateFun();
		break;
	    default:
		//error handling
		alert('Unknown mode: ' + this.mode);
	    }
	} // end of transition code
    }
}

//----------------------
// Update fun (Animation for refocusing)
//----------------------
focalStackViewer.prototype.canvasUpdateFun = function(){
    var canvas = this.anchor_div_obj.children('.activeLayer');
    canvas = canvas[0]; //TODO: should only have one, why do I need this?
    var context = canvas.getContext("2d"); //there should only be one object
    var viewer = this;
    // settimeOut and delay simply do not work well inside a loop
    // http://stackoverflow.com/questions/1776687/settimeout-inside-for-loop
    var interval = setInterval(
	function() { 
	    viewer.cur_idx = viewer.cur_idx + viewer.step;
	    //console.log('cur_idx: ' + viewer.cur_idx);
	    context.drawImage(viewer.img_objs[viewer.cur_idx], 0, 0);

	    viewer.remain--;
	    //console.log('remain: ' + viewer.remain);

	    // somehow there is a bug here
	    // sometimes viewer.remain can become negative?
	    if( viewer.remain <= 0) 
	    {clearInterval(interval); // exit the loop
	     //console.log("here");
	     return;
	    }
	} , this.delay_time);
}

focalStackViewer.prototype.imgUpdateFun = function(){
    var img_obj = this.anchor_div_obj.children('.activeLayer');
    var viewer = this;
    var interval = setInterval(
	function() { 
	    viewer.cur_idx = viewer.cur_idx + viewer.step;

	    img_obj.attr("src", 
			 viewer.data_obj.src_dir 
			 + "frame" + viewer.cur_idx + ".jpg")
                .show(); //TODO: check index here 

	    viewer.remain--;
	    // there seems to be a bug that sometimes viewer.remain can become negative?
	    // force return when viewer.remain <= 0
	    if( viewer.remain <= 0){
		clearInterval(interval); // exit the loop
		//console.log("here");
		return;
	    }
	} , this.delay_time);
}


//-------------------------------
// preload all the entire stack to memory
//-------------------------------
focalStackViewer.prototype.preloadImages = function(data_obj){
    var loadedimages=0;
    var postaction=function(){}; //empty function?

    //var arr=(typeof arr!="object")? [arr] : arr;
    function imageloadpost(){
	loadedimages++;
	if (loadedimages==data_obj.frame_number){
	    postaction(); //call postaction 
	}
    }

    //var frameIdx = 0;
    for (var i=0; i<data_obj.frame_number; i++){
	this.img_objs[i]=new Image();
	//frameIdx = i+1;
	this.img_objs[i].src=data_obj.src_dir + 'frame' + (i+1) + '.jpg'; // 1-based index
	this.img_objs[i].onload=function(){
	    imageloadpost();
	};
	this.img_objs[i].onerror=function(){
	    imageloadpost();
	};
    }
    return { //return blank object with done() method
	done:function(f){
	    postaction=f || postaction; //remember user defined callback functions to be called when images load
	}
    };
}

//----------------------
// performs look up table here
//----------------------
focalStackViewer.prototype.getFocalStackIndex = function(event, target) {
    pos_x = event.pageX - target.offset().left;
    pos_y = event.pageY - target.offset().top;

    id = target.attr('id');

    // $('#'+id+"_cross").css('left', (pos_x-9) + "px");
    // $('#'+id+"_cross").css('top' , (pos_y-9) + "px");
    // $('#'+id+"_cross").show(); //hide the curson after clicking 
    // TODO: curson icon may disappera after first clicking

    if(pos_x < 0 || pos_y < 0) {
	return -1;
    }

    var context = document.getElementById('focusViewer_Canvas').getContext('2d');

    var data = context.getImageData(pos_x, pos_y, this.width, this.height).data;

    //console.log('(x, y, idx): (%d, %d, %d)', pos_x, pos_y, idx);
    return data[0];
}
