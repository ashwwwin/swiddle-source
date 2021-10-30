import _ from 'underscore'
import ListenerService from '@/Services/ListenerService'

const cards = require('@/Models/humanityCards.js')
const pbnjDataModel = require('@/Models/pbnjGameData')
const userModel = require('@/Models/user')
const coinLogModel = require('@/Models/coinLog')

const gameList = new Map()

function getDeck() {
  return cards.getDeck();
}

function removeFromArray(array: any[], item: any) {
  const index = array.indexOf(item);
  if (index != -1) array.splice(index, 1);
}

export function createGame(playerIds: any[], gameId: string) {
  const game: any = {
    id: gameId,
    players: [],
    deck: getDeck(),
    currentBlackCard: "",
    //Instead of a typical round system, PB n J uses a point system, when 1 user reaches 300 points - the game ends
    pointsToWin: 300,
    czarIdx: 0,
    roundNum: 1,
  };
  for (const playerId of playerIds) {
    game.players.push({
      id: playerId,
      selectedWhiteCardId: null,
      awesomePoints: 0,
    });
  }
  startGame(game);
  gameList.set(gameId, game);

  return gameData(game);
}

export function getGame(gameId: string) {
  return gameList.get(gameId);
}

function deleteGame(gameId: string) {
  gameList.delete(gameId);
}

function startGame(game: any) {
  setCurrentBlackCard(game);
  _.each(game.players, function(player) {
    player.cards = [];
    for(let i = 0; i < 7; i++) {
      drawWhiteCard(game, player);
    }
  });
}

function roundEnded(game: any) {
  // let joined = false;
  // if (game.joinedPlayerIds.length) {
  //   for (const joinedId of game.joinedPlayerIds) {
  //     joinGame(game.id, joinedId);
  //   }
  //   game.joinedPlayerIds = [];
  //   joined = true;
  // }

  setCurrentBlackCard(game);

  _.each(game.players, function(player, idx) {
    if(idx != game.czarIdx) {
      removeFromArray(player.cards, player.selectedWhiteCardId);
      drawWhiteCard(game, player);
    }

    player.selectedWhiteCardId = null;
  });

  game.czarIdx = (game.czarIdx + 1) % game.players.length;
  game.roundNum++;

  // if (joined) {
  //   const playerIds: any = [];

  //   for (const player of game.players) {
  //     playerIds.push(player.id);
  //   }

  //   const data: any = {
  //     gameType: 'humanity',
  //     playerIds,
  //     gameRoomId: game.id,
  //     gameData: game,
  //   }
  //   ListenerService.emitRoomEvent(game.id, 'start-game', data)
  // } else {
  // }
  ListenerService.emitRoomEvent(game.id, 'start-humanity-game', game);
}

function drawWhiteCard(game: any, player: any) {
  if (player.cards.length >= 7) {
    return;
  }
  const whiteIndex = Math.floor(Math.random() * game.deck.white.length);
  player.cards.push(game.deck.white[whiteIndex]);
  game.deck.white.splice(whiteIndex, 1);
}

function setCurrentBlackCard(game: any) {
  const index = Math.floor(Math.random() * game.deck.black.length);
  game.currentBlackCard = game.deck.black[index];
  game.deck.black.splice(index, 1);
}

function getPlayer(gameId: any, playerId: any) {
  const game = getGame(gameId);
  return _.find(game.players, function(x) { return x.id == playerId; });
}

function getPlayerByCardId(gameId: any, cardId: any) {
  const game = getGame(gameId);
  return _.findWhere(game.players, { selectedWhiteCardId: cardId });
}

export function selectCard(gameId: string, playerId: string, whiteCardId: string) {
  const player = getPlayer(gameId, playerId);
  player.selectedWhiteCardId = whiteCardId;

  const game = getGame(gameId);

  const readyPlayers = _.filter(game.players, function (x) {
    return x.selectedWhiteCardId;
  });

  if (readyPlayers.length === game.players.length - 1) {
    ListenerService.emitRoomEvent(gameId, 'review-card', game.players);
  }
  const log = new pbnjDataModel({
    gameRoomId: gameId,
    roundNumber: game.roundNum,
    userId: playerId,
    blackCard: game.currentBlackCard,
    answer: whiteCardId,
    winner: false,
    totalPlayers: game.players.length
  })
  log.save()
}

export async function selectWinner(gameId: string, cardId: string) {
  const player = getPlayerByCardId(gameId, cardId);
  const game = getGame(gameId);
  player.awesomePoints += 300;
  ListenerService.emitRoomEvent(gameId, 'select-winner', {
    cardId,
    playerId: player.id,
    points: player.awesomePoints
  });
  if (player.awesomePoints == game.pointsToWin) {
    game.timer = setTimeout(() => {
      ListenerService.emitRoomEvent(game.id, 'result-humanity-game', game);
      deleteGame(game.id);
    }, 3000);

    const user = await userModel.findOne({
      _id: player.id
    })
    if (user) {
      const coinLog = new coinLogModel({
        userId: player.id,
        gameRoomId: game.id,
        gameType: 'PB n J',
        coins: 300
      })
      coinLog.save()

      if (user.coins === undefined) {
        user.coins = 300
      } else {
        user.coins += 300
      }
      user.save()

      ListenerService.clients.get(player.id)?.socket.emit('earned-coin', {
        add: 300,
        total: user.coins
      })
    }
  } else {
    game.timer = setTimeout(() => {
      roundEnded(game);
    }, 3000);
  }
  pbnjDataModel.findOneAndUpdate({
    gameRoomId: gameId,
    answer: cardId
  }, {
    winner: true
  }, {
    upsert: true
  })
}

function gameData(game: any) {
  const copy = Object.assign({}, game);
  delete copy.deck;
  return copy;
}

// export function joinPlayer(gameId: string, playerId: string) {
//   const game = getGame(gameId);
//   if (!game) {
//     return false
//   }
//   game.joinedPlayerIds.push(playerId);
//   return game;
// }

export function joinGame(gameId: string, playerId: string) {
  const game = getGame(gameId);
  if (!game) {
    return false
  }
  clearTimeout(game.timer);
  const player = {
    id: playerId,
    selectedWhiteCardId: null,
    awesomePoints: 0,
    cards: [],
  }
  for(let i = 0; i < 7; i++) {
    drawWhiteCard(game, player);
  }
  game.players.push(player);
  return game;
}

// export function leaveObserve(gameId: string, playerId: string) {
//   const game = getGame(gameId);
//   if (!game) {
//     return false
//   }
//   const joinedPlayerIds = game.joinedPlayerIds;
//   if (joinedPlayerIds.includes(playerId)) {
//     joinedPlayerIds.splice(joinedPlayerIds.indexOf(playerId), 1)
//   }
// }

export function leaveGame(gameId: string, playerId: string) {
  const game = getGame(gameId);
  if (!game) {
    return false
  }
  clearTimeout(game.timer);
  let index = 0;
  game.players.forEach((player: any, idx: number) => {
    if (player.id === playerId) {
      index = idx;
    }
  });
  if (index != -1) game.players.splice(index, 1);
  return game;
}
