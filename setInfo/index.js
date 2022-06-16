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
  close_one_position_market,
  close_one_position_limit,
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
        if (COINS.white_list.find((bl) => bl.symbol == result.name)) {
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
    if (res?.result && res.result.length != 0) {
      for (const position of res.result) {
        // 만약 구매한 상태라면,
        if (parseFloat(position.size) != 0) {
          const onPositionObj = on_position_coin_list.find(
            (e) => e.symbol == position.symbol && e.side == position.side
          );
          if (onPositionObj) {
            if (parseFloat(position.size) > parseFloat(onPositionObj.qty)) {
              // 만약 추매이면,
              // 구입 시간 갱신
              onPositionObj.time = Date.now();
              // 수량 갱신
              onPositionObj.qty = position.size;
              // 가격 갱신
              onPositionObj.price = position.entry_price;

              // 청산가 갱신
              onPositionObj.liq_price = parseFloat(position.liq_price);
            }
          } else if (onPositionObj == null) {
            console.log("on_position_coin_list에 들어감 !!");
            on_position_coin_list.push({
              symbol: symbol,
              side: position.side,
              price: position.entry_price,
              qty: position.size,
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

        /**
         * ######### TP/SL 세팅해주는 부분 limit order 때문에 임시 폐쇄
         */
        // if (
        //   position.size != 0 &&
        //   (position.stop_loss == 0 || position.take_profit == 0)
        // ) {
        //   // TP/SL 가 설정되어 있지 않다면,
        //   const thisModule = require("./index");
        //   await thisModule.setTPandSL(
        //     position.symbol,
        //     position.side,
        //     parseFloat(position.entry_price)
        //   );
        //   // !@#
        // }
        /**
         * ######## TP/SL 세팅해주는 부분 끝
         */
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
    // console.log(symbol, "check_limit_order_list()", res);

    if (res == null || res.result == undefined) return;

    if (res.result?.length != 0) {
      coin_info[idx].order = [];
      for (const order of res.result) {
        if (
          order.order_status == "New" ||
          order.order_status == "PartiallyFilled"
        ) {
          const position = order.order_link_id.split("-")[3];
          coin_info[idx].order.push({
            id: order.order_id,
            position: parseInt(position),
            price: parseFloat(order.price),
          });
        }
      }
    } else {
      coin_info[idx].order = [];
    }

    // long, short,both 상태 체크해서 주문 취소해줌.
    if (trade.position_direction == "long") {
      for (const order of coin_info[idx].order) {
        if (order.position == 1 || order.position == 2) {
          await cancel_one_side_limit_order(symbol, "Sell");
          break;
        }
      }
    } else if (trade.position_direction == "short") {
      for (const order of coin_info[idx].order) {
        if (order.position == 3 || order.position == 4) {
          await cancel_one_side_limit_order(symbol, "Buy");
          break;
        }
      }
    }
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

  check_position_order: async (symbol) => {
    for (const position of on_position_coin_list) {
      if (position.symbol == symbol) {
        const coinObj = coin_info.find((e) => e.symbol == symbol);
        if (!coinObj) return;
        const current_price = parseFloat(coinObj.current_price);

        console.log(
          position.symbol,
          "## 포지션 정리까지 남은 시간 ",
          Date.now() - position.time
        );
        console.log(position.symbol, "## 청산 가격 => ", position.liq_price);
        console.log(
          "## 숏일경우 익절 가격 => ",
          position.price -
            position.price *
              TRADE.close_position.profit.profit_percentage *
              0.01
        );
        console.log(
          "## 롱일경우 익절 가격 => ",
          position.price +
            position.price *
              TRADE.close_position.profit.profit_percentage *
              0.01
        );
        console.log(
          "### position 들어간 금액  => ",
          position.price,
          position.side
        );

        /**
         * 청산가격 방어 check 하는 부분
         */

        if (position.side == "Sell") {
          if (parseFloat(position.liq_price) < current_price * 1.04) {
            console.log("청산 방지를 위해 포지션을 모두 정리합니다. ######");
            await close_one_position_market(symbol, position.side);
          }
        } else {
          if (parseFloat(position.liq_price) * 1.04 > current_price) {
            console.log("청산 방지를 위해 포지션을 모두 정리합니다. ######");
            await close_one_position_market(symbol, position.side);
          }
        }

        /**
         * THE END #################################
         */
        if (
          Date.now() - position.time >
          TRADE.close_position.close_position_time * 1000
        ) {
          // 해당하는 포지션 작업이 왔다면, 설정파일에 있는 시간를 체크함
          // 설정파일에서 설정한 시간이 지났다면 포지션 정리
          console.log(symbol, "### close_one_position_limit()로 전달  ");
          // 만약 포지션 정리할게 많다면 시장가로 정리
          const on_position_length = on_position_coin_list.length;
          if (on_position_length > 5) {
            await close_one_position_market(symbol, position.side);
          } else {
            await close_one_position_limit(symbol, position.side);
          }
        } else if (
          (position.side == "Sell" &&
            current_price <
              position.price -
                position.price *
                  TRADE.close_position.profit.profit_percentage *
                  0.01) ||
          (position.side == "Buy" &&
            current_price >
              position.price +
                position.price *
                  TRADE.close_position.profit.profit_percentage *
                  0.01)
        ) {
          // 만약 롱과 숏이 설정해놓은 퍼샌테이지 이상의 익절 상태라면,
          console.log(
            symbol,
            "#### 익절# 로직작동",
            position.side,
            ",## 현재가:",
            current_price
          );
          // 만약 포지션 정리할게 많다면 시장가로 정리
          const on_position_length = on_position_coin_list.length;
          if (on_position_length > 5) {
            await close_one_position_market(symbol, position.side);
          } else {
            await close_one_position_limit(symbol, position.side);
          }
        } else if (
          (position.side == "Sell" &&
            current_price >
              position.price +
                position.price *
                  TRADE.close_position.loss.loss_percentage *
                  0.01) ||
          (position.side == "Buy" &&
            current_price <
              position.price -
                position.price *
                  TRADE.close_position.loss.loss_percentage *
                  0.01)
        ) {
          // 만약 롱과 숏이 설정해놓은 퍼샌테이지 이상의 익절 상태라면,
          console.log(
            symbol,
            "#### 손절# 로직작동",
            position.side,
            ",## 현재가:",
            current_price
          );
          // 만약 포지션 정리할게 많다면 시장가로 정리
          const on_position_length = on_position_coin_list.length;
          if (on_position_length > 5) {
            await close_one_position_market(symbol, position.side);
          } else {
            await close_one_position_limit(symbol, position.side);
          }
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
      stop_loss =
        order_price +
        (order_price * TRADE.close_position.loss.loss_percentage) / 100;
      take_profit =
        order_price -
        (order_price * TRADE.close_position.profit.profit_percentage) / 100;
    } else {
      // long인 경우,
      stop_loss =
        order_price -
        (order_price * TRADE.close_position.loss.loss_percentage) / 100;
      take_profit =
        order_price +
        (order_price * TRADE.close_position.profit.profit_percentage) / 100;
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
