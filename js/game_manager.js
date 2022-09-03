function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 9;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));

  this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Clear the game won/lost message
  this.setup();
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
  this.actuator.continueGame(); // Clear the game won/lost message
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  return this.over;
};

// Set up the game
GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    //Set up decks
    this.storageManager.resetdeck();
    this.storageManager.drawdeck();
    this.storageManager.resetgiant();
    

    // Add the initial tiles
    this.addStartTiles();
    //Update score
    this.updatescore();
  }

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile([this.grid.randomAvailableCell()],true);
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function (spawnlocations,nogiant) {
  var pool=[];//Dedupe our list
  var poolo={};
  for(var i=0;i<spawnlocations.length;i++){
    var cell=spawnlocations[i];
    var str=JSON.stringify(cell);
    if(!poolo[str]){
      poolo[str]=1;
      pool.push(cell);
    }
  }
  //alert(JSON.stringify(pool));
  var cell=pool[Math.floor(Math.random()*pool.length)];
  if (this.grid.cellsAvailable()) {
    var value = this.storageManager.getnext();
    value=value[Math.floor(Math.random()*value.length)];
    var tile = new Tile(cell,value);
    this.grid.insertTile(tile);
    this.storageManager.draw(nogiant);
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score);
  }

  // Clear the state when the game is over (game over only, not win)
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    bestScore:  this.storageManager.getBestScore(),
    terminated: this.isGameTerminated(),
    next:this.tilify()
  });

};

GameManager.prototype.tilify=function(){//Turn next into actual tiles
  var next=this.storageManager.getnext();
  var tilified=[];
  for(var i=0;i<next.length;i++){
    tilified.push(new Tile({x:i,y:0},next[i]));
  }
  return tilified;
};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over
  };
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();
  var spawnlocations=[];

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && self.mergable(next.value,tile.value) && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value+next.value);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);
        }else{
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
          spawnlocations.push(self.findedgeposition(cell,vector));//This is for a Threes mechanics thing.
        }
      }
    });
  });

  if (moved) {
    //console.log(cells);
    //alert(spawnlocations);
    this.storageManager.setGameState(this.serialize());
    this.addRandomTile(spawnlocations);
    this.updatescore();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
};

GameManager.prototype.updatescore=function(){
  var cells=this.grid.cells;
  this.score=0;
  for(var i=0;i<4;i++){
    for(var j=0;j<4;j++){
      var tile=cells[i][j];
      if(tile){
        this.score+=this.scoretile(tile.value);
      }
    }
  }
};

GameManager.prototype.scoretile=function(tile){
  if(tile<3){
    return 0;
  }
  var score=3;
  while(tile>3){
    score*=3;
    tile/=2;
  }
  return score;
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;
  var next={x:cell.x+vector.x,y:cell.y+vector.y};
  if(!this.grid.withinBounds(next)){//You can't move a tile out of the grid
    return {farthest:cell,next:next};//next:cell doesn't work for some reason
  }
  if(this.grid.cellAvailable(next)){//But you can move it into an empty space
    return {farthest:next,next:next};
  }
  return {farthest:cell,next:next};//And you can move it into another tile iff they're mergable
};

GameManager.prototype.findedgeposition=function(cell,vector){
  var edge={x:cell.x,y:cell.y};
  var dx=vector.x;
  var dy=vector.y;
  while(this.grid.withinBounds(edge)){
    edge.x-=dx;
    edge.y-=dy;
  }
  edge.x+=dx;
  edge.y+=dy;
  return edge;
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

          if (other && self.mergable(other.value,tile.value)) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};
GameManager.prototype.mergable=function(a,b){
  //console.log(a);
  //console.log(b);
  if(a+b===3){//1 and 2 merge
    return true;
  }
  return a===b&&!(a%3);//Equal tiles merge except 1 and 2
};