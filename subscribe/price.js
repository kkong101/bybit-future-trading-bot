const { WebsocketClient } = require("bybit-api");
const { coin_info } = require("../globalState/index");
const { check_close_position } = require("../check/index");
const { on_position_coin_list } = require("../globalState/index");

module.exports = {
  /**
   * 실시간 가격을 업데이트 하는 부분
   */
  setCurrentPrice: (secretObj) => {
    const ws = new WebsocketClient(secretObj);

    coin_info.forEach((e) => {
      ws.subscribe(`trade.${e.symbol}`);
    });

    ws.on("update", async (data) => {
      const direction_list = [];
      // ZeroMinusTick & ZeroPlusTick 제거
      for (const res of data.data) {
        if (
          res.tick_direction != "ZeroMinusTick" &&
          res.tick_direction != "ZeroPlusTick"
        ) {
          direction_list.push(res);
        }
      }
      // 가격 변동이 없으면 return 시킴.
      if (direction_list.length == 0) return;
      const obj = direction_list[direction_list.length - 1];
      const symbol = obj.symbol;
      // ###### 가격이 변동되면 손절/익절 할건지 체크 and BB전략 지표 세팅
      for (const coin of on_position_coin_list) {
        if (coin.symbol == symbol) {
          check_close_position(coin.symbol);
        }
      }
    });
  },
};
