const { on_position_coin_list } = require("../globalState/index");
const {
  findCoinInfo,
  getPercentage,
  findOnPositionObj,
} = require("../utils/index");
const { white_list } = require("../COINS.json");

module.exports = {
  /**
   * 일단 사용 X
   * @returns
   */
  isBuy_BB_Stretagy: () => {
    // 1분 단위로 up, down에 따라 limit order를 수정해줌.
    return true;
  },
  /**
   * -1: 아무것도 X, 0: 손절, 1: 부분 익절, 2: 전량 익절,
   * @param {*} symbol
   * @returns
   */
  isSell_BB_Stretagy: (symbol, side) => {
    const onPositionObj = findOnPositionObj(symbol, side);
    const coinObj = findCoinInfo(symbol);
    if (onPositionObj === null || coinObj === null) return -1;

    const entry_price = onPositionObj.price;
    const market_price = coinObj.current_price;

    const isPartiallyClosed = coinObj.stop_loss_price !== 0;

    // 퍼샌테이지 구하는 부분
    const percentage = getPercentage(market_price, entry_price, side);

    console.log("## 현재 포지션에 위치한 퍼샌테이지", percentage);

    const whiteCoinObj = white_list.find((e) => e.symbol === symbol);
    if (whiteCoinObj === null) return -1;

    // ########### 익절/손절 부분 check하는 곳  ###########
    if (whiteCoinObj.take_profit < percentage) {
      return 2;
    } else if (
      !isPartiallyClosed &&
      whiteCoinObj.partial_profit_percent < percentage
    ) {
      return 1;
    } else if (
      isPartiallyClosed &&
      side === "Sell" &&
      market_price > coinObj.stop_loss_price
    ) {
      // 손절가가 변경되었을때 손절하는 경우
      return 0;
    } else if (
      isPartiallyClosed &&
      side === "Buy" &&
      market_price < coinObj.stop_loss_price
    ) {
      // 손절가가 변경되었을때 손절하는 경우
      return 0;
    } else if (whiteCoinObj.stop_loss < percentage * -1) {
      return 0;
    }
    // ########### 익절/손절 부분 check하는 곳  ###########

    return -1;
  },
};
