const { coin_info, trade } = require("../globalState/index");
const { getAxios, postAxios } = require("../axios/index");
const { cancelAll, cancel_one_side_limit_order } = require("../trade/deposit");
const {
  circuit_breaker,
  on_position_coin_list,
} = require("../globalState/index");
const { getPercentage } = require("../utils/index");
const {
  get_current_price,
  create_limit_order,
  close_one_position,
} = require("../trade/order");
const { checkNullish } = require("../utils/index");
const COINS = require("../COINS.json");
const TRADE = require("../TRADE.json");

module.exports = {
  getCoinInfo: async () => {
    const symbol_url = "/v2/public/symbols";
    const res = await getAxios(symbol_url);

    if (res?.ret_msg === "OK") {
      for (const result of res.result) {
        const coinObj = COINS.white_list.find((bl) => bl.symbol == result.name);
        if (coinObj) {
          const current_price = await get_current_price(result.name);
          if (checkNullish(current_price)) return;

          coin_info.push({
            symbol: result.name,
            tick_size: parseFloat(result.price_filter.tick_size),
            min_price: parseFloat(result.price_filter.min_price),
            min_trading_qty: parseFloat(result.lot_size_filter.min_trading_qty),
            qty_step: parseFloat(result.lot_size_filter.qty_step),
            previous_price: current_price,
            current_price: current_price,
            profit_left_count: coinObj.profit_percentage.length,
            order: [],
          });
        }
      }
    }
  },
  check_circuit_breaker: async (price) => {
    if (isNaN(price) || circuit_breaker.btc_price == 0) return;
    const current_percentage = Math.abs(
      getPercentage(price, circuit_breaker.btc_price)
    );

    // 최초 탐지
    if (
      circuit_breaker.signal_start_time == null &&
      TRADE.circuit_breaker.percentage * 100 < current_percentage
    ) {
      circuit_breaker.signal_start_time = Date.now();
      console.log("최초탐지!!!!!!!");
      console.log("최초탐지!!!!!!!");
      console.log("최초탐지!!!!!!!");
      console.log("최초탐지!!!!!!!");
    }

    // 1분동안 유지 시
    if (
      Date.now() - circuit_breaker.signal_start_time > 1000 * 60 &&
      TRADE.circuit_breaker.percentage * 100 < current_percentage
    ) {
      // 서킷 브레이커 들어감.
      trade.is_circuit_breaker = true;
      setTimeout(() => {
        trade.is_circuit_breaker = false;
        circuit_breaker.signal_start_time = null;
        console.log("circuit breaker 시간 끝!");
      }, TRADE.circuit_breaker.time * 1000);
      console.log("circuit breaker 시작!!");
      console.log("circuit breaker 시작!!");
      console.log("circuit breaker 시작!!");
      console.log("circuit breaker 시작!!");
      console.log("circuit breaker 시작!!");
      await cancelAll();
    }

    // 1분 유지 하지 못할 시 다시 reset해줌.
    if (
      circuit_breaker.signal_start_time != null &&
      Date.now() - circuit_breaker.signal_start_time < 1000 * 60 &&
      TRADE.circuit_breaker.percentage * 100 > current_percentage
    ) {
      circuit_breaker.signal_start_time = null;

      console.log("탐지 들어갔지만 다시 리셋!!");
      console.log("탐지 들어갔지만 다시 리셋!!");
      console.log("탐지 들어갔지만 다시 리셋!!");
      console.log("탐지 들어갔지만 다시 리셋!!");
      console.log("탐지 들어갔지만 다시 리셋!!");
    }
  },
  check_on_position_list: async (symbol) => {
    console.log("check_on_position_list 시작");
    const res = await getAxios("/private/linear/position/list", {
      symbol: symbol,
    });
    if (checkNullish(res)) return;
    if (res?.result && res.result?.length != 0) {
      for (const position of res.result) {
        // 만약 구매한 상태라면,
        if (parseFloat(position.size) != 0) {
          const onPositionObj = on_position_coin_list.find(
            (e) => e.symbol == position.symbol && e.side == position.side
          );

          if (onPositionObj) {
            const prev_qty = parseFloat(onPositionObj.qty);
            if (parseFloat(position.size) > prev_qty) {
              // 만약 추매이면,
              // 구입 시간 갱신
              onPositionObj.time = Date.now();
              // 수량 갱신
              onPositionObj.qty = parseFloat(position.size);
              // 가격 갱신
              onPositionObj.price = parseFloat(position.entry_price);

              // 청산가 갱신
              onPositionObj.liq_price = parseFloat(position.liq_price);
            } else if (parseFloat(position.size) < prev_qty) {
              // 부분 익절이라면,
              // ### profit_left_count 부분 계산해줌
              const coinObj = coin_info.find((e) => e.symbol == symbol);
              coinObj.profit_left_count = coinObj.profit_left_count - 1;

              // 구입 시간 갱신
              onPositionObj.time = Date.now();
              // 수량 갱신
              onPositionObj.qty = parseFloat(position.size);
              // 가격 갱신
              onPositionObj.price = parseFloat(position.entry_price);

              // 청산가 갱신
              onPositionObj.liq_price = parseFloat(position.liq_price);
            }
          } else if (onPositionObj == null) {
            console.log("on_position_coin_list에 들어감 !!");
            on_position_coin_list.push({
              symbol: symbol,
              side: position.side,
              price: parseFloat(position.entry_price),
              qty: parseFloat(position.size),
              time: Date.now(),
              liq_price: parseFloat(position.liq_price),
            });
          }
        } else {
          // 구매하지 않은 상태라면
          // on_position_coin_list에서 빼준다.
          const idx = on_position_coin_list.findIndex(
            (e) => e.symbol == symbol && position.side == e.side
          );
          if (idx != -1) on_position_coin_list.splice(idx, 1);
        }
      }
      /**
       * 교차인지 체크해서 만약 교차이면 isolated로 변경
       */
      let is_isolated = true;
      let is_right_leverage = true;
      for (const position of res.result) {
        if (position.size != 0 && !position.is_isolated) is_isolated = false;
        if (trade.leverage != parseFloat(position.leverage))
          is_right_leverage = false;
      }

      if (!is_isolated) {
        const thisModule = require("./index");
        await thisModule.set_isolated_mode(symbol);
      }

      if (!is_right_leverage) {
        await postAxios("/private/linear/position/set-leverage", {
          symbol: symbol,
          buy_leverage: trade.leverage,
          sell_leverage: trade.leverage,
        });
      }

      // order.id 부분 체크하는 부분
      const order_res = await getAxios("/private/linear/order/search", {
        symbol,
      });

      /**
       * The End ###
       */
    }
  },
  check_limit_order_list: async (symbol) => {
    const idx = coin_info.findIndex((e) => e.symbol == symbol);
    if (idx == -1) return;

    const res = await getAxios("/private/linear/order/search", {
      symbol,
    });
    if (checkNullish(res)) return;

    if (res == null || res.result == undefined) return;

    if (res.result?.length != 0) {
      coin_info[idx].order = [];
      for (const order of res.result) {
        if (
          order.order_status == "New" ||
          order.order_status == "PartiallyFilled"
        ) {
          const position = order.order_link_id.split("-")[0];
          coin_info[idx].order.push({
            id: order.order_id,
            side: position,
            price: parseFloat(order.price),
          });
        }
      }
    } else {
      coin_info[idx].order = [];
    }
    console.log("#### coin_info[idx].order", coin_info[idx].order);
  },
  check_position_change: async (symbol) => {
    // 포지션 체크해서 주문을 넣어주는 것까지 해주는 함수

    const idx = coin_info.findIndex((e) => e.symbol == symbol);
    if (idx == -1) return;
    const onPositionList = on_position_coin_list.filter(
      (e) => e.symbol == symbol
    );
    if (
      !onPositionList.find((e) => e.side == "Buy") &&
      !coin_info[idx].order.find((e) => e.position == 3)
    ) {
      // 롱이 없으면 롱 주문 넣어줌
      await create_limit_order(symbol, [3]);
    }
    if (
      !onPositionList.find((e) => e.side == "Sell") &&
      !coin_info[idx].order.find((e) => e.position == 2)
    ) {
      // 숏이 없으면 숏 주문 넣어줌
      await create_limit_order(symbol, [2]);
    }
  },

  close_position_3_set: async (symbol, type, side, idx) => {
    const res1 = await close_one_position(symbol, type, side, "Limit", idx);
    if (res1 === true) return true;
    const res2 = await close_one_position(symbol, type, side, "Limit", idx);
    if (res2 === true) return true;
    if (type === "all") {
      const res = await close_one_position(symbol, type, side, "Market", idx);
      if (res === true) return true;
    } else {
      setTimeout(async () => {
        const res = await close_one_position(symbol, type, side, "Limit", idx);
        if (res === true) return true;
        if (res === true) return;
        setTimeout(async () => {
          const res = await close_one_position(
            symbol,
            type,
            side,
            "Limit",
            idx
          );
          if (res === true) return true;
        }, 110);
      }, 110);
    }
    return false;
  },

  // 포지션 정리할지 체크하는곳
  check_position_order: async (symbol, idx) => {
    if (on_position_coin_list.length === 0) return;
    for (const position of on_position_coin_list) {
      if (position.symbol == symbol) {
        let current_percentage;
        if (position.side == "Buy") {
          current_percentage =
            ((coin_info[idx].current_price - position.price) / position.price) *
            100;
        } else if (position.side == "Sell") {
          current_percentage =
            ((position.price - coin_info[idx].current_price) / position.price) *
            100;
        }

        console.log("### 현재 코인 가격", coin_info[idx].current_price);
        console.log("### 구매한 코인 가격", position.price);
        console.log("### current_percentage", current_percentage);
        const thisModule = require("./index");

        const COINS_JSON = COINS.white_list.find((e) => e.symbol == symbol);
        if (current_percentage < COINS_JSON.stop_loss * -1) {
          console.log("### 손절합니다");
          // 만약 손절가 라면, 정리
          const result = await thisModule.close_position_3_set(
            symbol,
            "all",
            position.side,
            idx
          );
        }

        // 익절 1~3차 까지 진행
        const take_profit_list = COINS_JSON.profit_percentage;

        if (
          coin_info[idx].profit_left_count === 3 &&
          take_profit_list[0] < current_percentage
        ) {
          console.log("### 1차 익절 조건 진입");
          // 만약 1차 익절 조건에 충족한다면,
          const result = await thisModule.close_position_3_set(
            symbol,
            "1/3",
            position.side,
            idx
          );
        } else if (
          coin_info[idx].profit_left_count === 2 &&
          take_profit_list[1] < current_percentage
        ) {
          console.log("### 2차 익절 조건 진입");
          // 만약 2차 익절 조건에 충족한다면,
          const result = await thisModule.close_position_3_set(
            symbol,
            "1/3",
            position.side,
            idx
          );
        } else if (
          coin_info[idx].profit_left_count === 1 &&
          take_profit_list[2] < current_percentage
        ) {
          // 만약 3차 익절 조건에 충족한다면,
          const result = await thisModule.close_position_3_set(
            symbol,
            "all",
            position.side,
            idx
          );
        } else if (
          position.side === "Buy" &&
          coin_info[idx].curr_ema_30 > coin_info[idx].curr_ema_7
        ) {
          console.log("### 11크로스 진입");
          // EMA가 서로 크로스가 되었다면,
          await thisModule.close_position_3_set(
            symbol,
            "all",
            position.side,
            idx
          );
        } else if (
          position.side === "Sell" &&
          coin_info[idx].curr_ema_30 < coin_info[idx].curr_ema_7
        ) {
          // EMA가 서로 크로스가 되었다면,
          console.log("### 22크로스 진입");
          await thisModule.close_position_3_set(
            symbol,
            "all",
            position.side,
            idx
          );
        } else if (coin_info[idx].profit_left_count <= 0) {
          // 익절할 횟수가 전부 지났다면,
          console.log("### 익절 모두했어용");
          return;
        }
      }
    }
  },
  set_isolated_mode: async (symbol) => {
    const params = {
      symbol: symbol,
      is_isolated: true,
      buy_leverage: trade.leverage,
      sell_leverage: trade.leverage,
    };

    await postAxios("/private/linear/position/switch-isolated", params);

    console.log("고립으로 mode 변경 ");
  },
  check_available_coin_trade: () => {
    const available_balance = trade.total_money * trade.using_money_rate;
    const delete_idx_list = [];
    let idx = 0;
    let total_coin_num = coin_info.length;
    for (const coin of coin_info) {
      const one_coin_available_balnce =
        available_balance / (total_coin_num * 2);
      const qty = one_coin_available_balnce / coin.current_price;
      if (qty < coin.min_trading_qty) {
        console.log("qty", qty, "coin.min_trading_qty", coin.min_trading_qty);
        console.log("######################################################");
        console.log(
          "## 보유한 금액으로",
          coin.symbol,
          "를 거래할 수 없습니다."
        );
        console.log("######################################################");
        total_coin_num--;
        delete_idx_list.push(idx);
      }
      idx++;
    }

    delete_idx_list.sort((a, b) => b - a);

    for (const idx of delete_idx_list) {
      coin_info.splice(idx, 1);
    }
  },
  setTPandSL: async (symbol, side, order_price) => {
    console.log("##### setTPandSL 실행", symbol, "###", order_price);
    const COIN_JSON_INFO = COINS.white_list.find((e) => e.symbol == symbol);
    let precision_num = 0;
    let stop_loss = 0;
    let take_profit = 0;
    const price = order_price;
    const idx = coin_info.findIndex((e) => e.symbol == symbol);

    const stringed_number = price.toString();
    const splited_price = coin_info[idx].current_price.toString().split(".");
    if (
      stringed_number.split(".")[0].length != stringed_number.length &&
      splited_price.length == 2
    ) {
      precision_num = splited_price[1].length;
    }

    // Target Profit, Stop Loss(익절, 손절) 구하는 부분
    if (side == "Sell") {
      stop_loss = order_price + (order_price * COIN_JSON_INFO.loss) / 100;
      take_profit = order_price - (order_price * COIN_JSON_INFO.profit) / 100;
    } else {
      // long인 경우,
      stop_loss = order_price - (order_price * COIN_JSON_INFO.loss) / 100;
      take_profit = order_price + (order_price * COIN_JSON_INFO.profit) / 100;
    }

    stop_loss = stop_loss.toFixed(precision_num);
    take_profit = take_profit.toFixed(precision_num);
    const req = {
      symbol: symbol,
      side: side,
      take_profit: take_profit,
      stop_loss: stop_loss,
    };
    const res = await postAxios("/private/linear/position/trading-stop", req);
    if (res?.ret_code != 0) {
      console.log("#### err /private/linear/position/trading-stop");
      console.log(req);
      console.log("#########");
      console.log(res);
      console.log("############");
    } else {
      console.log("###### setTPandSL 성공 ");
      console.log(res);
      console.log("##########");
    }
  },
};
