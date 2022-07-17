const crypto = require("crypto");
const SECRET = require("../secret/SECRET.json");
const { coin_info, on_position_coin_list } = require("../globalState/index");

module.exports = {
  /**
   * 서명해주는 함수
   * @param {} param
   * @returns
   */
  getSignature: (param) => {
    let orderedParams = "";
    Object.keys(param)
      .sort()
      .forEach((key) => {
        orderedParams += key + "=" + param[key] + "&";
      });

    orderedParams = orderedParams.substring(0, orderedParams.length - 1);

    return crypto
      .createHmac(
        "sha256",
        SECRET.mode === "live" ? SECRET.live.API_SECRET : SECRET.test.API_SECRET
      )
      .update(orderedParams)
      .digest("hex");
  },
  /**
   * 퍼샌테이지 계산해주는 함수
   * @param {*} market_price
   * @param {*} entry_price
   * @returns
   */
  getPercentage: (market_price, entry_price, side) => {
    const percentage = 1 - market_price / entry_price;
    let result = percentage < 1 ? percentage * -1 : percentage - 1;
    if (side !== "Buy") result = result * -1;
    return result * 100;
  },
  /**
   * null 체크해주는 함수
   * @param {*} res
   * @returns
   */
  checkNullish: (res) => {
    if (res == null || res == undefined) {
      console.log("##### err Null or undefined 발견");
      console.log(res);
      return true;
    } else {
      return false;
    }
  },
  /**
   * 로그 출력해주는 함수
   * @param {String} text
   * @param {"dev" || "all"} type
   * @returns
   */
  makeLog: (text, type) => {
    if (SECRET.log_mode) {
      console.log(text);
      return;
    }
    // type => dev, all
    const isLive = SECRET.mode === "live";
    if (type === "all") {
      console.log(text);
    } else if (type === "dev" && !isLive) {
      console.log(text);
    }
  },
  /**
   * 긴 소수점을 처리해주는 함수
   * @param {타켓실수} longFloat
   * @param {끊어줄 소수점 자리} min_size
   */
  getCleanFloat: (longFloat, min_size) => {
    let precision_num = 0;
    const splitedList = min_size.toString().split(".");
    if (splitedList.length > 1) {
      precision_num = splitedList[1].length;
    }
    return parseFloat(longFloat.toFixed(precision_num));
  },
  /**
   * 최소 수량에 맞춰서 나머지 제거하는 함수
   * @param {*} qty
   * @param {*} qty_step
   */
  getClearnQty: (qty, qty_step) => {
    const longFloat = qty - (qty % qty_step);
    const splitedList = qty_step.toString().split(".");
    if (splitedList.length > 1) {
      precision_num = splitedList[1].length;
    }
    return parseFloat(longFloat.toFixed(precision_num));
  },
  /**
   * 몇초동안 작동 정지?
   * @param {interger} ms
   */
  sleep: (ms) => {
    const wakeUpTime = Date.now() + ms;
    while (Date.now() < wakeUpTime) {}
  },
  /**
   * 해당 코인의 정보를 찾는 함수
   * @param {*} symbol
   * @param {*} side
   */
  findCoinInfo: (symbol) => {
    if (coin_info.length === 0) return null;
    for (const coin of coin_info) {
      if (coin.symbol === symbol) return coin;
    }
    return null;
  },
  /**
   * 해당 코인 오브젝트의 order를 찾아주는 함수
   * @param {coin_info} coinObj
   * @param {*} side
   * @returns
   */
  findOrderInfo: (coinObj, side) => {
    if (coinObj === null) return null;
    for (const order of coinObj.order) {
      if (order.side === side) return order;
    }
    return null;
  },
  existLimitOrder: (coinObj) => {
    if (coinObj === null) return null;
    if (coinObj.order.length === 0) return false;
    return true;
  },
  existOnPosition: (symbol) => {
    for (const position of on_position_coin_list) {
      if (position.symbol === symbol) {
        return true;
      }
    }
    return false;
  },
  /**
   * 현재 채결된 코인의 오브젝트를 가져오는 함수
   * @param {*} symbol
   * @param {*} side
   * @returns
   */
  findOnPositionObj: (symbol, side = "") => {
    if (on_position_coin_list.length === 0) return null;
    const existSide = side === "Buy" || side === "Sell";
    if (!existSide) return null;
    for (const position of on_position_coin_list) {
      if (existSide && position.symbol === symbol && position.side === side) {
        return position;
      }
    }
    return null;
  },
  findOnPositionList: (symbol) => {
    if (on_position_coin_list.length === 0) return [];
    let res = [];
    for (const position of on_position_coin_list) {
      if (position.symbol === symbol) {
        res.push(position);
      }
    }
    if (res.length > 0) return res;
    return [];
  },
  findOnPositionIdx: (symbol, side) => {
    const idx = on_position_coin_list.findIndex(
      (e) => e.symbol == symbol && e.side == side
    );
    return idx;
  },
  /**
   * 요청한게 잘 체결 되었는지?
   * @param {*} res
   */
  isWellContacted: (res) => {
    if (res == null || res == undefined) return false;
    if (res?.ret_msg == "OK" && res?.ret_code == 0) {
      return true;
    }
    return false;
  },
  getSecretInfo: (isUpdate) => {
    return {
      key: SECRET.mode == "live" ? SECRET.live.API_KEY : SECRET.test.API_KEY,
      secret:
        SECRET.mode == "live" ? SECRET.live.API_SECRET : SECRET.test.API_SECRET,
      wsUrl:
        SECRET.mode == "live"
          ? isUpdate
            ? SECRET.websocket.private.live
            : SECRET.websocket.public.live
          : isUpdate
          ? SECRET.websocket.private.test
          : SECRET.websocket.public.test,
    };
  },
};
