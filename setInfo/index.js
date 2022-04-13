const { coin_info } = require("../globalState/index");
const { getAxios } = require("../axios/index");
const { circuit_breaker } = require("../globalState/index");
const { getPercentage } = require("../utils/index");
const { trade } = require("../globalState/index");
const COINS = require("../COINS.json");
const TRADE = require("../TRADE.json");

module.exports = {
  getCoinInfo: async () => {
    const symbol_url = "/v2/public/symbols";
    const res = await getAxios(symbol_url);

    if (res.ret_msg === "OK") {
      res.result.forEach((e) => {
        // 블랙 리스트 제외한 나머지 추가.
        if (COINS.white_list.find((bl) => bl.symbol == e.name)) {
          coin_info.push({
            symbol: e.name,
            tick_size: parseFloat(e.price_filter.tick_size),
            min_price: parseFloat(e.price_filter.min_price),
            min_trading_qty: parseFloat(e.lot_size_filter.min_trading_qty),
            qty_step: parseFloat(e.lot_size_filter.qty_step),
            previous_price: 0,
          });
        }
      });
    }
  },
  set_circuit_breaker_condition: async () => {
    circuit_breaker.checked_time = Date.now();
    const res = await getAxios("/public/linear/kline", {
      symbol: "BTCUSDT",
      interval: 1,
      from: Math.ceil(Date.now() / 1000) - 60 * 5,
    });
    circuit_breaker.btc_price = res.result[0].open;
  },
  check_circuit_breaker: (price) => {
    if (isNaN(price) || circuit_breaker.btc_price == 0) return;
    const current_percentage = Math.abs(
      getPercentage(price, circuit_breaker.btc_price)
    );
    console.log(getPercentage(price, circuit_breaker.btc_price));

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
        console.log("circuit breaker 시간 끝!");
      }, TRADE.circuit_breaker.time * 1000);
      circuit_breaker.signal_start_time = null;
      circuit_breaker.end_circuit_breaker_time =
        Date.now() + TRADE.circuit_breaker.time * 1000;
      console.log("circuit breaker 시작!!");
      console.log("circuit breaker 시작!!");
      console.log("circuit breaker 시작!!");
      console.log("circuit breaker 시작!!");
      console.log("circuit breaker 시작!!");
      // 모든 주문 취소 해야댐.
      // 근데 limit rate 때문에 주문을 전부 취소 못할 수도 있음..
      // 이거 예외사항 처리 해줘야댐.
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
};
