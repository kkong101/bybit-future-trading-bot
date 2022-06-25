const SECRET = require("./SECRET.json");
const {
  cancelAll,
  setBalance,
  cancel_one_side_limit_order,
} = require("./trade/deposit");
const { setVix } = require("./vix/index");
const { WebsocketClient } = require("bybit-api");
const { coin_info, on_position_coin_list } = require("./globalState/index");
const { trade } = require("./globalState/index");
const COINS = require("./COINS.json");
const TRADE = require("./TRADE.json");
const { replace_order, create_limit_order } = require("./trade/order");
const { check_send_order } = require("./subscribe/update");
const { getAxios } = require("./axios/index");
const {
  getCoinInfo,
  check_position_order,
  check_on_position_list,
  check_limit_order_list,
  set_isolated_mode,
} = require("./setInfo/index");
const EMA = require("technicalindicators").EMA;

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
  await getCoinInfo();
  await setBalance();
  await set_isolated_mode();

  const wsUpdate = new WebsocketClient(wsConfigUpdate);

  wsUpdate.subscribe("execution");

  const ws = new WebsocketClient(wsConfig);

  // 시작
  setTimeout(() => {
    for (const coin of coin_info) {
      coin.ready_position = true;
    }
  }, 10000);

  coin_info.forEach((e) => {
    ws.subscribe(`trade.${e.symbol}`);
  });

  // ############## 실시간 코인 가격 받는 부분
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
    const price = parseFloat(obj.price);
    const idx = coin_info.findIndex((e) => e.symbol == symbol);
    const COINS_JSON = COINS.white_list.find((e) => e.symbol === symbol);

    // ###### 가격이 변동되면 손절/익절 할건지 체크하는 부분
    for (const coin of on_position_coin_list) {
      if (coin.symbol == symbol) {
        await check_position_order(coin.symbol, idx);
      }
    }
    // #############################################

    // 코인 가격 업데이트 해줌.
    if (idx != -1) coin_info[idx].current_price = price;

    // 현재 EMA 구하는 부분
    if (coin_info[idx].prev_ema_30 == undefined) return;

    const curr_ema_30 =
      coin_info[idx].prev_ema_30 * (1 - 2 / (COINS_JSON.slow_EMA + 1)) +
      price * (2 / (COINS_JSON.slow_EMA + 1));
    const curr_ema_7 =
      coin_info[idx].prev_ema_7 * (1 - 2 / (COINS_JSON.rapid_EMA + 1)) +
      price * (2 / (COINS_JSON.rapid_EMA + 1));
    coin_info[idx].curr_ema_30 = curr_ema_30;
    coin_info[idx].curr_ema_7 = curr_ema_7;
    console.log("###30", curr_ema_30);
    console.log("###7", curr_ema_7);
    const percent = curr_ema_30 / curr_ema_7;
    const diff_percent =
      percent > 1 ? -1 * (percent - 1) * 100 : (1 - percent) * 100;
    console.log("diff", diff_percent);
    if (diff_percent < 0) {
      coin_info[idx].up_or_down = "down";
    } else {
      coin_info[idx].up_or_down = "up";
    }

    console.log("###", coin_info[idx]);

    /**
     *  if (
        coin_info[idx].prev_ema_7 < coin_info[idx].prev_ema_30 &&
        diff_percent > 0 &&
        diff_percent < COINS_JSON.limit_order_signal
    )
     */

    // 롱포지션 탑승 아래에서 위로 넘어오는 애만
    if (diff_percent > 0 && diff_percent < COINS_JSON.limit_order_signal) {
      const sideIdx = coin_info[idx].order.findIndex((e) => e.side === "Buy");
      if (sideIdx === -1) {
        // 구매 후 1분간 거래 정지
        await check_limit_order_list(symbol);
        const res = await create_limit_order(
          symbol,
          "Buy",
          curr_ema_7 + (curr_ema_7 * COINS_JSON.limit_order_gap) / 100,
          idx
        );
      }
    }

    // 숏포지션 탑승 위에서 아래로 내려오는 애만
    if (diff_percent < 0 && diff_percent > COINS_JSON.limit_order_signal * -1) {
      const sideIdx = coin_info[idx].order.findIndex((e) => e.side === "Buy");
      if (sideIdx === -1) {
        // 구매 후 1분간 거래 정지
        await check_limit_order_list(symbol);
        const res = await create_limit_order(
          symbol,
          "Sell",
          curr_ema_7 - (curr_ema_7 * COINS_JSON.limit_order_gap) / 100,
          idx
        );
      }
    }

    console.log("### diff_percent", diff_percent);
    // 둘다 아니라면 포지션취소하고 그리고 포지션잡지 않고 대기
    if (
      diff_percent < COINS_JSON.limit_order_signal * -1 ||
      diff_percent > COINS_JSON.limit_order_signal
    ) {
      for (const order of coin_info[idx].order) {
        console.log(
          "### 둘다 아니라면 포지션취소하고 그리고 포지션잡지 않고 대기",
          order
        );
        await cancel_one_side_limit_order(symbol, order.side, idx);
      }
    }
  });
  // ######### 실시간 코인 가격 받는 부분 끝
  const queue = [];
  // ######## 체결 받는 부분
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
  // ###############

  // 포지션 체크
  setInterval(async () => {
    for (const coin of coin_info) {
      await check_on_position_list(coin.symbol);
      await check_limit_order_list(coin.symbol);
      setBalance();
      set_isolated_mode();
    }
  }, 20 * 1000);

  // #########

  // ### EMA 체크하는 부분
  setTimeout(() => {
    let prev_min = 0;
    setInterval(async () => {
      // queue에 쌓긴 거래 내역 업데이트 해주는 부분
      if (queue.length > 0) {
        while (true) {
          console.log("#### queue 실행");
          const symbol = queue.shift().symbol;
          await check_on_position_list(symbol);
          if (queue.length === 0) break;
        }
      }
      // EMA 체크 ####
      for (const coin of coin_info) {
        if (new Date().getMinutes() === prev_min) {
        } else {
          const COINS_JSON = COINS.white_list.find(
            (e) => e.symbol == coin.symbol
          );
          const server_time = parseInt(new Date().getTime() / 1000);
          const res = await getAxios("/public/linear/kline", {
            symbol: coin.symbol,
            interval: 1,
            from: server_time - 11300,
          });
          let values = [];
          for (const e of res.result) {
            values.push(parseFloat(e.close));
          }
          const result_ema30 = EMA.calculate({
            period: COINS_JSON.slow_EMA,
            values: values,
          });

          coin.prev_ema_30 = parseFloat(result_ema30[result_ema30.length - 2]);
          const result_ema7 = EMA.calculate({
            period: COINS_JSON.rapid_EMA,
            values: values,
          });
          coin.prev_ema_7 = parseFloat(result_ema7[result_ema7.length - 2]);

          console.log(coin.prev_ema_30, coin.prev_ema_7);
          prev_min = new Date().getMinutes();
        }
      }
    }, 1000);
  }, 1000);

  // 에러 처리 해야되는 부분
  ws.on("close", () => {
    console.log("connection closed");
  });

  ws.on("error", (err) => {
    console.error("ERR", err);
  });
};

main();
