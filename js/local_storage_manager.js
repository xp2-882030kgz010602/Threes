window.fakeStorage = {
  _data: {},

  setItem: function (id, val) {
    return this._data[id] = String(val);
  },

  getItem: function (id) {
    return this._data.hasOwnProperty(id) ? this._data[id] : undefined;
  },

  removeItem: function (id) {
    return delete this._data[id];
  },

  clear: function () {
    return this._data = {};
  }
};

function LocalStorageManager() {
  this.bestScoreKey     = "bestScore";
  this.gameStateKey     = "gameState";
  this.nextkey="next";
  this.deckkey="deck";
  this.giantkey="giant";

  var supported = this.localStorageSupported();
  this.storage = supported ? window.localStorage : window.fakeStorage;
}

LocalStorageManager.prototype.localStorageSupported = function () {
  var testKey = "test";

  try {
    var storage = window.localStorage;
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
};

// Best score getters/setters
LocalStorageManager.prototype.getBestScore = function () {
  return this.storage.getItem(this.bestScoreKey) || 0;
};

LocalStorageManager.prototype.setBestScore = function (score) {
  this.storage.setItem(this.bestScoreKey, score);
};

// Game state getters/setters and clearing
LocalStorageManager.prototype.getGameState = function () {
  var stateJSON = this.storage.getItem(this.gameStateKey);
  return stateJSON ? JSON.parse(stateJSON) : null;
};

LocalStorageManager.prototype.setGameState = function (gameState) {
  this.storage.setItem(this.gameStateKey, JSON.stringify(gameState));
};

LocalStorageManager.prototype.clearGameState = function () {
  this.storage.removeItem(this.gameStateKey);
};

LocalStorageManager.prototype.getnext=function(){
  var next=this.storage.getItem(this.nextkey);
  return next?JSON.parse(next):null;
};

LocalStorageManager.prototype.setnext=function(next){
  this.storage.setItem(this.nextkey,JSON.stringify(next));
};

LocalStorageManager.prototype.clearnext=function(){
  this.storage.removeItem(this.nextkey);
};

LocalStorageManager.prototype.setdeck=function(deck){
  this.storage.setItem(this.deckkey,JSON.stringify(deck));
};

LocalStorageManager.prototype.getdeck=function(){
  return JSON.parse(this.storage.getItem(this.deckkey));
};

LocalStorageManager.prototype.resetdeck=function(){
  var deck=[1,1,1,1,2,2,2,2,3,3,3,3];
  for(var i=deck.length-1;i>=1;i--){//Fisher-Yates shuffle
    var j=Math.floor((i+1)*Math.random());
    deck[i]=[deck[j],deck[j]=deck[i]][0];
  }
  this.setdeck(deck);
};

LocalStorageManager.prototype.drawdeck=function(){
  var deck=this.getdeck();
  var card;
  if(deck.length){
    card=[deck.pop()];
  }else{
    this.resetdeck();
    deck=this.getdeck();
    card=[deck.pop()];
  }
  this.setnext(card);
  this.setdeck(deck);
};

LocalStorageManager.prototype.setgiant=function(giant){
  this.storage.setItem(this.giantkey,JSON.stringify(giant));
};

LocalStorageManager.prototype.getgiant=function(){
  return JSON.parse(this.storage.getItem(this.giantkey));
};

LocalStorageManager.prototype.resetgiant=function(){
  var giant=[];
  for(var i=0;i<21;i++){
    giant.push(0);
  }
  giant[Math.floor(Math.random()*21)]=1;
  this.setgiant(giant);
};

LocalStorageManager.prototype.drawgiant=function(){
  var giant=this.getgiant();
  var card;
  if(giant.length){
    card=giant.pop();
  }else{
    this.resetgiant();
    giant=this.getgiant();
    card=giant.pop();
  }
  this.setgiant(giant);
  return card;
};

LocalStorageManager.prototype.draw=function(nogiant){
  if(nogiant){
    this.drawdeck();
    return;
  }
  var isgiant=this.drawgiant();
  if(isgiant){
    var maxtile=0;
    var board=this.getGameState().grid.cells;
    for(var i=0;i<4;i++){
      for(var j=0;j<4;j++){
        var tile=board[i][j];
        if(tile){
           maxtile=Math.max(maxtile,tile.value);
        }
      }
    }
    if(maxtile>=48){//Skip giants if they can't spawn
      if(maxtile===48){
        this.setnext([6]);
      }else if(maxtile===96){
        this.setnext([6,12]);
      }else{
        var centers=[];
        var max=maxtile/8;//Can't use bit shift since we might go past 32-bit integers
        for(var n=12;n<max;n*=2){
          centers.push(n);
        }
        var center=centers[Math.floor(Math.random()*centers.length)];
        this.setnext([center/2,center,center*2]);
      }
      return;
    }
  }
  this.drawdeck();
};