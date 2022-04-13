const SECRET = require("./SECRET.json");
const { cancelAll, setBalance } = require("./trade/deposit");
const { setVix } = require("./vix/index");
const { WebsocketClient } = require("bybit-api");
const { coin_info, on_position_coin_list } = require("./globalState/index");
const { trade } = require("./globalState/index");
const COINS = require("./COINS.json");
const TRADE = require("./TRADE.json");
const {
  order_long_position,
  replace_order,
  order_short_position,
  close_one_position,
  close_all_position,
} = require("./trade/order");

const { getCoinInfo } = require("./setInfo/index");

const API_KEY = SECRET.bybit.API_KEY;
const PRIVATE_KEY = SECRET.bybit.API_SECRET;
const symbol_url = "/v2/public/symbols";

const wsConfig = {
  key: API_KEY,
  secret: PRIVATE_KEY,
  wsUrl: "wss://stream-testnet.bybit.com/realtime_public",
};

const wsConfigUpdate = {
  key: API_KEY,
  secret: PRIVATE_KEY,
  wsUrl: "wss://stream-testnet.bybit.com/realtime_private",
};

// 시작했을 때 코인 정보 가져오는 부분

const main = async () => {
  await setBalance();
  await getCoinInfo();
  setVix();

  const wsUpdate = new WebsocketClient(wsConfigUpdate);

  wsUpdate.subscribe("execution");

  const ws = new WebsocketClient(wsConfig);

  ws.close("trade.*");

  /**
   * 체결 정보 실시간으로 받는곳
   */
  wsUpdate.on("update", async (data) => {
    console.log("update , ", data);
    let idx = 0;
    data.data.forEach((e) => {
      // 연속 2번 들어왓으면 막아줌.
      on_position_coin_list.forEach((position) => {
        if (e.symbol == position.symbol && e.side == position.side) {
          // 연속적으로 2번 들어온거 막아주는 부분
          return;
        }
      });

      // 만약 구매 체결된 코인이라면... coin_list에서 삭제.
      let hap_idx = 0;
      coin_info.forEach((coin) => {
        if (e.symbol == coin.symbol) {
          coin.order_id.forEach((order) => {
            if (e.order_id.trim() == order.trim()) {
              idx = hap_idx;
            }
          });
        }
        hap_idx++;
      });
      if (idx != -1) {
        coin_info.splice(idx, idx);

        on_position_coin_list.forEach((position) => {
          if (e.symbol == position.symbol && e.side == position.side) {
            // 연속적으로 2번 들어온거 막아주는 부분
            return;
          }
        });

        on_position_coin_list.push({
          symbol: e.symbol,
          order_id: e.order_id,
          side: e.side,
        });
        // 900초 뒤에 포지션 정리.
        setTimeout(() => {
          console.log("qlwndlkqnwdlknqwd");
          console.log(e.symbol, e.side);
          close_one_position(e.symbol, e.side);
          console.log("klqjbdkljqwbdkjbqwdkljabsd,jn");
        }, TRADE.close_position.close_position_time * 1000);
      }

      //만약 포지션 정리하는 거래였다면,
      const position_idx = on_position_coin_list.findIndex((coin) => {
        e.order_id == coin.order_id;
      });
      if (position_idx != -1) {
        on_position_coin_list.splice(idx, idx);

        // 다시 주문 생성하고 주문번호를 계속 order_replace 해줘야댐.
      }
    });

    // 사용 가능한 금액 다시 setting 해줘야댐.
    await setBalance();

    // 익절 가격 설정
    // 여러 limit 주문이 체결되면 평단가가 변할거고
    // replace order로 target_profit 가격 변경해줘야댐.

    // 청산 가격 설정

    // 만약 익절한 경우라면, 지정가 추종 다시 시작해줘야댐.
  });

  ws.close("trade.*");
  coin_info.forEach((e) => {
    ws.subscribe(`trade.${e.symbol}`);
  });

  ws.on("update", async (data) => {
    if (trade.using_money_rate == 0) return;
    // 50틱 이상 가격에 걸어줌.
    const symbol = data.data[0].symbol;
    const price = parseFloat(data.data[0].price);

    // console.log(symbol, " => ", price);
    if ((coinObject = coin_info.find((e) => symbol == e.symbol))) {
      const tick_size = parseFloat(coinObject.tick_size);
      const current_price = price;
      const high_position_price =
        current_price + tick_size * TRADE.call_put_tick_size;
      const low_position_price =
        current_price - tick_size * TRADE.call_put_tick_size;

      let idx = coin_info.findIndex((e) => e.symbol == symbol);

      // 최초 포지션 진입하고 order_id를 저장함.
      if (!coinObject.order_id) {
        coin_info[idx].update_time = Date.now();

        // 일단 임시로 order_id setting 해놓음.
        coin_info[idx]["order_id"] = "hap";
        coin_info[idx].order_id = [];

        setTimeout(async () => {
          const short_res2 = await order_short_position(
            symbol,
            high_position_price + tick_size * TRADE.call_put_tick_size,
            `short-limit-2-${Date.now()}`
          );

          if (short_res2.ret_msg == "OK") {
            coin_info[idx].order_id.push(short_res2.result.order_id);
          }

          const short_res1 = await order_short_position(
            symbol,
            high_position_price,
            `short-limit-1-${Date.now()}`
          );

          if (short_res1.ret_msg == "OK") {
            coin_info[idx].order_id.push(short_res1.result.order_id);
          }

          const long_res1 = await order_long_position(
            symbol,
            low_position_price,
            `long-limit-1-${Date.now()}`
          );
          if (long_res1.ret_msg == "OK") {
            coin_info[idx].order_id.push(long_res1.result.order_id);
          }

          const long_res2 = await order_long_position(
            symbol,
            low_position_price - tick_size * TRADE.call_put_tick_size,
            `long-limit-2-${Date.now()}`
          );
          if (long_res2.ret_msg == "OK") {
            coin_info[idx].order_id.push(long_res2.result.order_id);
          }
        }, 40);
      } else {
        if (Date.now() - coin_info[idx].update_time > 3000) {
          // 같은 가격이면 요청 보내지 않음.tick_size
          if (
            coin_info[idx].previous_price + coin_info[idx].tick_size >= price &&
            coin_info[idx].previous_price - coin_info[idx].tick_size <= price
          ) {
            return;
          }

          const res1 = await replace_order(
            symbol,
            high_position_price + tick_size * TRADE.call_put_tick_size,
            coin_info[idx].order_id[0],
            price,
            idx,
            `short-limit-2-${Date.now()}`
          );

          const res2 = await replace_order(
            symbol,
            high_position_price,
            coin_info[idx].order_id[1],
            price,
            idx,
            `short-limit-1-${Date.now()}`
          );

          const res3 = await replace_order(
            symbol,
            low_position_price,
            coin_info[idx].order_id[2],
            price,
            idx,
            `long-limit-1-${Date.now()}`
          );

          const res4 = await replace_order(
            symbol,
            low_position_price - tick_size * TRADE.call_put_tick_size,
            coin_info[idx].order_id[3],
            price,
            idx,
            `long-limit-2-${Date.now()}`
          );

          coin_info[idx].update_time = Date.now();
        }
      }
    }
  });

  /**
   * 거래가 체결되면 order_id 다시한번 받아와서 정렬해줘야댐.... 헐..
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
