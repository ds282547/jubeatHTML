(function() {
  var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  window.requestAnimationFrame = requestAnimationFrame;
  })();

  var boxsize = 100;
  var dis = 10;
  var border = boxsize * 4 + dis * 5;
  var canvas = document.createElement("canvas");
  
  var ctx = canvas.getContext("2d");
  canvas.width = canvas.height = border;
  canvas.style.backgroundColor = "black";
  document.body.append(canvas);

  ctx.showMarker = function (xx,yy,f){
      var x = xx * (boxsize+dis) + dis;
      var y = yy * (boxsize+dis) + dis;
      var sx = (f%5);
      var sy = (f/5) >> 0;
      var sz = 100;
      sx*=sz;sy*=sz;
      this.drawImage(img,sx,sy,sz,sz,x,y,boxsize,boxsize);
  }
  ctx.showMarker2 = function (index,f){
      ctx.showMarker(index%4,(index/4) >> 0,f);
  }

  var img = new Image();
  img.src = "marker_sht.jpg";
  img.onload = function(){
      ready();
  }
  
  var progress = 0;



  function step(timestamp) {
      progress++;
      ctx.showMarker(0,0,progress % 25)

      if (progress < 2000) {
          requestAnimationFrame(step);
      }
  }
  function ready(){
      //requestAnimationFrame(step);
  }

  var player = {};
  // clip system
  player.clapSound = {};
  player.clapSound.createClipSound = function (){
      this.fileName = "handclap.wav";
      this.audioCount = 5;
      this.audioList = [];
      for(var i=0;i<this.audioCount;++i){
          var myAudio = new Audio(this.fileName);
          myAudio.preload = "true";

          this.audioList.push(myAudio);
      }
      this.playPointer = 0;
  }
  player.clapSound.play = function(){
      this.audioList[this.playPointer].play();
      this.playPointer = (this.playPointer+1) % this.audioCount;
  }


  player.init = function(){
      player.clapSound.createClipSound();
      player.prepareTime = 1/30*20;
  }

  player.init();
  player.loadSong = function(name){
      //load music
      player.songName = name;
      player.audio = new Audio(name+".mp3");
      //load notes
      player.audio.oncanplay = function(){
          console.log("["+player.songName+"] Music Loaded");
      }
    
      fetch("/"+name+"2.txt")
      .then( response => response.text() )
      .then( text => player.processN tes(text) )

  }
  player.processNotes = function(data){
      console.log(data);

      bardatas = data.split("\r\n\r\n");

      var barnotes;
      var bartimes;
      var sameBar = false;
      var noteQueue = [];
      var BPM = 150;
      var Clock = 0;

      for(var i=0;i<bardatas.length;++i){
          var bardata = bardatas[i];
          var lines = bardata.split("\r\n");

          if(sameBar){
              sameBar = false;
          } else {
              barnotes = {};
              bartimes = [];
          }
          for(var j=0;j<4;++j){
              var line = lines[j];
              var component = line.split('|');
              if(component.length == 1){
                  sameBar = true;
              } else if (component.length >= 2){
                  sameBar = false;
                  var bartime_line = [];
                  var noteCount = 0;
                  //parse time order
                  for(var k=0;k<component[1].length;++k){
                      var order = component[1].charAt(k);
                      if(order == '('){
                          //bpm
                          var sp = ++k;
                          while(component[1].charAt(++k)!=')'){};
                          bartime_line.push({type:"B",val:parseInt(component[1].substring(sp,k))});
                          
                      } else if(order == '['){
                          //offset
                          var sp = ++k;
                          while(component[1].charAt(++k)!=']'){};
                          bartime_line.push({type:"O",val:parseInt(component[1].substring(sp,k))});
                      } else {
                          noteCount++;
                          var value;
                          if(order == '-'){
                              //Rest
                              value = 0;
                          } else {
                              //Note
                              value = parseInt(order,16);
                          }
                          bartime_line.push({type:"N",val:value});
                      }
                  }
                  bartime_line.noteCount = noteCount;
                  bartimes.push(bartime_line);
              }
              //parse position in 4*4 bar
              for(var k=0;k<4;++k){
                  var order = component[0].charAt(k);
                  if(order != 'x'){
                      order = parseInt(order,16);
                      if(barnotes[order]){
                          barnotes[order].push(j*4+k);
                      } else {
                          barnotes[order] = [j*4+k];
                      }
                  } 
              }
              //console.log(barnotes);
             
          }
          if (!sameBar){
              for(var j=0;j<4;++j){
                  var bartime_line = bartimes[j];
                  var noteCount = bartime_line.noteCount;
                  for(var k=0;k<bartime_line.length;++k){
                      var note = bartime_line[k];
                      switch(note.type){
                          case 'B':
                              BPM = note.val;
                              break;
                          case 'O':
                              Clock += note.val/BPM/2 + 0.1;
                              break;
                          case 'N':
                              if(note.val>0){
                                  note.poses = barnotes[note.val];
                                  if(note.poses == undefined) {
                                      console.log(bardata );
                                      console.log(barnotes);
                                      console.log(note.val );
                                  }
                                  note.time = Clock;
                                  Clock += (60 / BPM) / noteCount;
                                  noteQueue.push(note);
                              } else {
                                  Clock += (60 / BPM) / noteCount;
                              }
                              break;
                      }
                  }
              }
          }
          
      }

      this.noteQueue = noteQueue;
      console.log(this.noteQueue);
  }


  player.loadSong("evans");

  player.step = function(){
      player.progress++;
      //ctx.showMarker(0,0,progress % 25)

      var songClock = player.audio.currentTime;
      if (songClock > player.nextNoteTime){
          player.clapSound.play();

          player.notePointer++;
          player.nextNoteTime = player.noteQueue[player.notePointer].time;
      }
      if (songClock > player.showingNextNoteTime){
          var Times = new Array(player.showingTimeSeqN);
          for(var i=0;i<player.showingTimeSeqN;++i){
              Times[i] = player.noteQueue[player.showingPointer].time + player.showingTimeSeq[i];
          }
          player.showingQueue.push({poses: player.noteQueue[player.showingPointer].poses, times : Times, frame:0})

          player.showingPointer++;
          player.showingNextNoteTime = player.noteQueue[player.showingPointer].prepareTime;
      }


      if (player.showingQueue.length > 0){
          var endShow = false;
          for(var i=0;i<player.showingQueue.length;++i){
              var showing = player.showingQueue[i];
              
              if(songClock > showing.times[showing.frame]){
                  for(var j=0;j<showing.poses.length;++j){
                      ctx.showMarker2(showing.poses[j],showing.frame);

                  }
                  showing.frame++;
                  if(showing.frame>=player.showingTimeSeqN){
                      endShow = true;
                      break;
                  }
              }

          }
          if(endShow){
              player.showingQueue.shift();
          }
      }

      if (player.progress >= 0) {
          requestAnimationFrame(player.step);
      }
  }
  player.startStep = function(){
      this.progress = 0;
      this.notePointer = 0;
      this.nextNoteTime = this.noteQueue[0].time;
      
      requestAnimationFrame(player.step);
      //this.intervalID = setInterval(player.step,10);

      //Graph showing
      this.showingQueue = [];
      this.showingPointer = 0;
      for(var i=0;i<this.noteQueue.length;++i){
          this.noteQueue[i].prepareTime = this.noteQueue[i].time - this.prepareTime * this.audio.playbackRate;
      }

      this.showingTimeSeqN = 25;
      this.showingTimeSeq = [];
      for(var i=0;i<this.showingTimeSeqN;++i){
          this.showingTimeSeq.push((i-12)*(1/30)* this.audio.playbackRate);
      }

      this.showingNextNoteTime = this.noteQueue[0].prepareTime;
  }
  player.playSong = function(){
      //this.audio.playbackRate = 0.8;
      this.audio.play();
      this.startStep();
      console.log("?");
  }

  player.playButton = document.getElementById("play");
  player.playButton.onclick = function (){
      player.playSong();
      
  }
  player.clapButton = document.getElementById("clap");
  player.clapButton.onclick = function(){
      player.clapSound.play();
  }

  window.onbeforeunload = function(){
      if(player.intervalID){
          clearInterval(player.intervalID);
      }
  }

