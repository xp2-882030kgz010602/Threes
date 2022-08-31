function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");
  this.nextcontainer=document.querySelector(".next-container");

  this.score = 0;
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    self.clearContainer(self.tileContainer);

    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) {
          self.addTile(cell);
        }
      });
    });

    self.updateScore(metadata.score);
    self.updateBestScore(metadata.bestScore);

    if (metadata.terminated) {
      if (metadata.over) {
        self.message(false); // You lose
      }
    }
    var next=metadata.next;
    self.clearContainer(self.nextcontainer);
    for(var i=0;i<next.length;i++){
      self.addTile(next[i],true);
    }

    setTimeout(function(){self.clearmerged()},200);

  });
};

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.continueGame = function () {
  this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};
HTMLActuator.prototype.ismerged=function(str){
  return str==="tile-merged"||str==="tile-merged-large";
};
HTMLActuator.prototype.clearmerged=function(){//Otherwise parts of tiles will continue to show up after they've been merged away
  var tilecontainer=this.tileContainer;
  var children=tilecontainer.children;
  var merged=[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  for(var i=0;i<children.length;i++){
    var child=children[i];
    var classes=child.className.split(" ");
    if(!this.ismerged(classes[3])&&!this.ismerged(classes[4])){//Only delete tiles if there's a simultaneous merged tile
      continue;
    }
    var position=classes[2];
    var x=1*position[14]-1;
    var y=1*position[16]-1;
    merged[x][y]=1;
  }
  for(var j=0;j<2;j++){
    for(var i=0;i<children.length;i++){
      var child=children[i];
      var classes=child.className.split(" ");
      if(this.ismerged(classes[3])||this.ismerged(classes[4])){//Only delete tiles if there's a simultaneous merged tile
        continue;
      }
      var position=classes[2];
      var x=1*position[14]-1;
      var y=1*position[16]-1;
      if(merged[x][y]){
        tilecontainer.removeChild(child);
      }
    }
    children=tilecontainer.children;
  }
};

HTMLActuator.prototype.islarge=function(value){
  if(value>=192&&value<=6144){
    return true;
  }
  return false;
};

HTMLActuator.prototype.addTile = function (tile,isnext) {
  var self = this;

  var wrapper   = document.createElement("div");
  var inner     = document.createElement("div");
  var position  = tile.previousPosition || { x: tile.x, y: tile.y };
  var positionClass = this.positionClass(position);
  var value=tile.value;

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", "tile-" + value, positionClass];

  if (value > 6144) classes.push("tile-super");

  this.applyClasses(wrapper, classes);
  var large=this.islarge(value);

  inner.classList.add("tile-inner");
  if(value>6144){
    inner.textContent = value;
  }

  if (tile.previousPosition) {
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
      self.applyClasses(wrapper, classes); // Update the position
    });
  } else if (tile.mergedFrom) {
    if(large){
      classes.push("tile-merged-large");
    }else{
      classes.push("tile-merged");
    }
    this.applyClasses(wrapper, classes);

    // Render the tiles that merged
    tile.mergedFrom.forEach(function (merged) {
      self.addTile(merged);
    });
  } else {
    if(large){
      classes.push("tile-new-large");
    }else{
      classes.push("tile-new");
    }
    this.applyClasses(wrapper, classes);
  }

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
  if(isnext){
    this.nextcontainer.appendChild(wrapper);
  }else{
    this.tileContainer.appendChild(wrapper);
  }
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator.prototype.updateScore = function (score) {
  this.clearContainer(this.scoreContainer);

  var difference = score - this.score;
  this.score = score;

  this.scoreContainer.textContent = this.score;

  if (difference > 0) {
    var addition = document.createElement("div");
    addition.classList.add("score-addition");
    addition.textContent = "+" + difference;

    this.scoreContainer.appendChild(addition);
  }
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
};

HTMLActuator.prototype.message = function (won) {
  var type    = "game-over";
  var message = "Out of moves!";

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-over");
};
