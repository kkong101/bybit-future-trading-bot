const SECRET = require("./SECRET.json");
const { cancelAll, setBalance } = require("./trade/deposit");
const { setVix } = require("./vix/index");
const { WebsocketClient } = require("bybit-api");
const { coin_info, on_position_coin_list } = require("./globalState/index");
const { trade } = require("./globalState/index");
const COINS = require("./COINS.json");
const TRADE = require("./TRADE.json");
const { replace_order, create_limit_order } = require("./trade/order");
const { check_send_order } = require("./subscribe/update");
const {
  getCoinInfo,
  check_position_order,
  check_circuit_breaker,
  checkPositionDirection,
} = require("./setInfo/index");

const API_KEY =
  SECRET.mode == "live" ? SECRET.bybit.API_KEY : SECRET.bybit_test.API_KEY;
const PRIVATE_KEY =
  SECRET.mode == "live"
    ? SECRET.bybit.API_SECRET
    : SECRET.bybit_test.API_SECRET;

console.log("### ", SECRET.mode);
console.log("### ", SECRET.mode);
console.log("### ", SECRET.mode);
console.log("### ", SECRET.mode);

const wsConfig = {
  key: API_KEY,
  secret: PRIVATE_KEY,
  wsUrl:
    SECRET.mode == "live"
      ? SECRET.websocket.public.live
      : SECRET.websocket.public.test,
};

const wsConfigUpdate = {
  key: API_KEY,
  secret: PRIVATE_KEY,
  wsUrl:
    SECRET.mode == "live"
      ? SECRET.websocket.private.live
      : SECRET.websocket.private.test,
};

// 시작했을 때 코인 정보 가져오는 부분

const main = async () => {
  await setVix();
  await cancelAll();
  await getCoinInfo();

  const wsUpdate = new WebsocketClient(wsConfigUpdate);

  wsUpdate.subscribe("execution");

  const ws = new WebsocketClient(wsConfig);

  let isReady = false;
  const request_interval = 500;

  /**
   * 최초 주문 넣어주는 부분
   */

  // setTimeout(async () => {
  //   let idx = 1;
  //   for (const coin of COINS.white_list) {
  //     setTimeout(async () => {
  //       const coinObject = coin_info.find((ee) => ee.symbol == coin.symbol);
  //       if (!coinObject) return;

  //       await create_limit_order(coin.symbol, [2, 3]);
  //       coinObject.update_time = Date.now();
  //     }, idx * request_interval);
  //     idx++;
  //   }
  //   setTimeout(() => {
  //     isReady = true;
  //   }, COINS.white_list.length * request_interval + 4000);
  // }, 7000);

  /**
   * END ###
   */

  const queue = [];
  const last_updated_time = [];
  let i = 0;
  for (const coin of COINS.white_list) {
    last_updated_time.push({
      symbol: coin.symbol,
      updated: Date.now() + i,
    });
    i += 2500;
  }

  /**
   * 매수 매도 (체결 정보) 실시간으로 받는곳
   */
  setTimeout(() => {
    wsUpdate.on("update", async (data) => {
      console.log("체결됨##############");
      console.log(data);
      console.log("체결됨##############");
      for (const res of data.data) {
        for (const q of queue) {
          if (q.symbol == res.symbol && q.side == res.side) return;
        }
        queue.push({
          symbol: res.symbol,
          side: res.side,
        });
      }
    });
    /**
     * END #####
     */

    /**
     *  1초마다 queue에 있는 작업들을 체크한뒤 하나씩 실행.
     */
    setInterval(async () => {
      if (!isReady) return;

      if (trade.is_circuit_breaker || trade.is_onCreate_order) {
        return;
      }

      for (const coin of last_updated_time) {
        if (Date.now() - coin.updated > 30000) {
          // console.log("check_send_order##### 작동");
          await check_send_order(coin.symbol);
          coin.updated = Date.now();
        }
      }

      if (queue.length == 0) return;

      while (true) {
        const symbol = queue.shift().symbol;
        await check_send_order(symbol);
        const idx = last_updated_time.findIndex((e) => e.symbol == symbol);
        last_updated_time[idx].updated = Date.now();
        if (queue.length == 0) return;
      }
    }, 1000);
  }, COINS.white_list.length * request_interval + 8000);
  /**
   * THE END #######
   */

  /**
   * 실시간 코인 가격 불러오는 부분 #####
   */
  setTimeout(() => {
    // ws.close("trade.*");
    coin_info.forEach((e) => {
      ws.subscribe(`trade.${e.symbol}`);
    });

    if (coin_info.find((e) => e.symbol == "BTCUSDT") == null)
      ws.subscribe(`trade.BTCUSDT`);

    ws.on("update", async (data) => {
      if (!isReady) return;
      if (trade.is_circuit_breaker) return;

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

      const price = parseFloat(obj.price);
      const symbol = obj.symbol;
      const idx = coin_info.findIndex((e) => e.symbol == symbol);
      if (symbol == "BTCUSDT") {
        if (!trade.is_circuit_breaker) await check_circuit_breaker(price);
      }
      // 코인 가격 업데이트 해줌.
      if (idx != -1) coin_info[idx].current_price = price;

      // ###### 가격이 변동되면 손절/익절 할건지 체크하는 부분
      for (const coin of on_position_coin_list) {
        if (coin.symbol == symbol) {
          await check_position_order(coin.symbol);
        }
      }
      // ##########################################
    });

    /**
     * 받아온 가격들을 queue에 넣어주고 symbol 단위로 처리해준다.
     */
    setInterval(async () => {
      // 포지션 정리할거 있는지 체크
      for (const coin of coin_info) {
        // 같은 가격이면 요청 보내지 않음.tick_size
        if (
          coin.previous_price >
            coin.current_price + coin.current_price * 0.01 * 0.08 ||
          coin.previous_price <
            coin.current_price - coin.current_price * 0.01 * 0.08
        ) {
          /**
           * 403이 떠서 일단 이렇게.... 0.0003708
           */
          const idx = coin_info.findIndex((e) => e.symbol == coin.symbol);
          const full_position_list = [2, 3];
          let time = 100;
          for (const p of full_position_list) {
            setTimeout(async () => {
              await replace_order(coin.symbol, coin.current_price, idx, p);
            }, time);
            time += 100;
          }
        } else {
          console.log(
            SECRET.mode,
            "#",
            coin.symbol,
            " => ####### 가격변동 없어서 break ######"
          );
        }
      }
    }, TRADE.order_interval * 1000);

    // ## 익절/손절 체크하는 부분
    setInterval(async () => {
      if (on_position_coin_list.length === 0) return;
      for (const coin of on_position_coin_list) {
        await check_position_order(coin.symbol);
      }
    }, 2000);
    // ## 익절/손절 체크하는 부분

    /**
     * THE END #####
     */
  }, COINS.white_list.length * request_interval + 8400);
  /**
   * THE END ###
   */

  // 에러 처리 해야되는 부분
  ws.on("close", () => {
    console.log("connection closed");
  });

  ws.on("error", (err) => {
    console.error("ERR", err);
  });
};

main();
