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
const { getAxios } = require("./axios/index");
const {
  getCoinInfo,
  check_position_order,
  checkPositionDirection,
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

  const wsUpdate = new WebsocketClient(wsConfigUpdate);

  wsUpdate.subscribe("execution");

  const ws = new WebsocketClient(wsConfig);

  // 체결 됬는지 체크하는 부분
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

    const price = parseFloat(obj.price);
    const symbol = obj.symbol;
    const idx = coin_info.findIndex((e) => e.symbol == symbol);

    // 코인 가격 업데이트 해줌.
    if (idx != -1) coin_info[idx].current_price = price;

    // 현재 EMA 구하는 부분
    if (coin_info[idx].prev_ema_30 == undefined) {
      console.log("zzz");
      return;
    }
    const curr_ema_30 =
      coin_info[idx].prev_ema_30 * (1 - 2 / 31) + price * (2 / 31);
    const curr_ema_7 =
      coin_info[idx].prev_ema_7 * (1 - 2 / 8) + price * (2 / 8);
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

    if (diff_percent > 0 && diff_percent < 0.11) {
      // 구매
    }

    if (diff_percent > 0 && diff_percent < 0.11) {
      // 구매
    }

    // ###############

    // ###### 가격이 변동되면 손절/익절 할건지 체크하는 부분
    for (const coin of on_position_coin_list) {
      if (coin.symbol == symbol) {
        await check_position_order(coin.symbol);
      }
    }
    // ##########################################
  });

  // ### EMA 체크하는 부분
  setTimeout(() => {
    let prev_min = 0;
    setInterval(async () => {
      for (const coin of coin_info) {
        if (new Date().getMinutes() === prev_min) {
          console.log("시간 아직 안바뀌어서 pass");
        } else {
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
            period: 30,
            values: values,
          });

          coin.prev_ema_30 = parseFloat(result_ema30[result_ema30.length - 2]);
          const result_ema7 = EMA.calculate({
            period: 7,
            values: values,
          });
          coin.prev_ema_7 = parseFloat(result_ema7[result_ema7.length - 2]);

          console.log(coin.prev_ema_30, coin.prev_ema_7);
          prev_min = new Date().getMinutes();
        }
      }
    }, 3000);
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
