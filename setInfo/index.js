const { coin_info } = require("../globalState/index");
const { getAxios } = require("../axios/index");
const {
  circuit_breaker,
  on_position_coin_list,
} = require("../globalState/index");
const { getPercentage } = require("../utils/index");
const { trade } = require("../globalState/index");
const {
  get_current_price,
  create_limit_order,
  close_one_position,
} = require("../trade/order");
const { setBalance } = require("../trade/deposit");
const COINS = require("../COINS.json");
const TRADE = require("../TRADE.json");

module.exports = {
  getCoinInfo: async () => {
    const symbol_url = "/v2/public/symbols";
    const res = await getAxios(symbol_url);

    if (res.ret_msg === "OK") {
      for (const result of res.result) {
        if (COINS.white_list.find((bl) => bl.symbol == result.name)) {
          const current_price = await get_current_price(result.name);

          coin_info.push({
            symbol: result.name,
            tick_size: parseFloat(result.price_filter.tick_size),
            min_price: parseFloat(result.price_filter.min_price),
            min_trading_qty: parseFloat(result.lot_size_filter.min_trading_qty),
            qty_step: parseFloat(result.lot_size_filter.qty_step),
            previous_price: current_price,
            order: [],
          });
        }
      }
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
  check_on_position_list: async (symbol) => {
    // 시작
    const res = await getAxios("/private/linear/position/list", {
      symbol: symbol,
    });

    for (const tt of on_position_coin_list) {
      console.log("판매까지 남은 시간 => ", Date.now() - tt.time);
    }

    if (res.result != null) {
      for (const position of res.result) {
        // 만약 구매한 상태라면,
        if (parseFloat(position.size) != 0) {
          let isDuplicated = false;
          for (const our_list of on_position_coin_list) {
            if (our_list.symbol == symbol && our_list.side == position.side) {
              isDuplicated = true;
              // 추매인지 확인 진행
              if (parseFloat(position.size) > parseFloat(our_list.qty)) {
                // 만약 추매이면,
                // 구입 시간 갱신
                our_list.time = Date.now();
                // 수량 갱신
                our_list.qty = position.size;
                // 가격 갱신
                our_list.price = position.entry_price;
              }
            }
          }
          if (!isDuplicated) {
            console.log("on_position_coin_list에 들어감 !!");
            on_position_coin_list.push({
              symbol: symbol,
              side: position.side,
              price: position.entry_price,
              qty: position.size,
              time: Date.now(),
            });
          }
        }
      }
    }
  },
  check_limit_order_list: async (symbol) => {
    const updated_order_list = [];

    const idx = coin_info.findIndex((e) => e.symbol == symbol);

    const res = await getAxios("/private/linear/order/search", {
      symbol,
    });

    if (res.result != null) {
      for (const order of res.result) {
        if (
          order.order_status == "New" ||
          order.order_status == "PartiallyFilled"
        ) {
          const position = order.order_link_id.split("-")[3];
          updated_order_list.push({
            id: order.order_id,
            position: parseInt(position),
          });
        }
      }
      // 업데이트 된 내용으로 변경해줌.
      coin_info[idx].order = updated_order_list;
    }
  },
  check_position_change: async (symbol) => {
    const coinObject = coin_info.find((coin) => coin.symbol == symbol);

    // 없는 포지션 숫자를 찾아서 배열에 담음.
    const absent_position_list = [];

    const position_list = coinObject.order.map((e) => e.position);
    const full_position_list = [1, 2, 3, 4];

    for (const position of full_position_list) {
      if (!position_list.includes(position)) {
        absent_position_list.push(position);
      }
    }

    // 만약 1, 2의 포지션이 없을 경우에 =>
    if (absent_position_list.includes(1) && absent_position_list.includes(2)) {
      // [1,2] 에 주문을 넣어준다.

      // 만약 1 ,2 포지션을 가지고 있다면 거래를 만들지 않고 1, 2번 포지션이 없다면 거래 보낸다.
      for (const position of on_position_coin_list) {
        if (position.symbol == coinObject.symbol && position.side == "Sell") {
          return;
        }
      }
      /**
       * 주문 넣는곳@@@@@
       */
      await create_limit_order(coinObject.symbol, coinObject.tick_size, [1, 2]);
      /**
       * 주문 넣는곳 끝
       */
    } else if (absent_position_list.includes(2)) {
      // 만약 2의 포지션이 없을 경우에 =>
      // 1을 2로 옮겨준다.
      const idx = coinObject.order.findIndex((e) => e.position == 1);
      if (idx == -1) return;
      coinObject.order[idx].position = 2;
    }

    if (absent_position_list.includes(3) && absent_position_list.includes(4)) {
      // 만약 3, 4의 포지션이 없을 경우에 =>
      // [3,4] 에 주문을 넣어준다.

      for (const position of on_position_coin_list) {
        if (position.symbol == coinObject.symbol && position.side == "Buy") {
          return;
        }
      }

      /**
       * 주문 넣는곳@@@@@
       */
      await create_limit_order(coinObject.symbol, coinObject.tick_size, [3, 4]);
      /**
       * 주문 넣는곳 끝
       */
    } else if (absent_position_list.includes(3)) {
      // 4을 3으로 옮겨준다.
      const idx = coinObject.order.findIndex((e) => e.position == 4);
      if (idx == -1) return;
      coinObject.order[idx].position = 3;
    }

    // on_position_list에 1번 혹은 2번 거래가 없고, 2번만 걸려 있을 시 1번 거래 넣어줌.
    if (
      on_position_coin_list.find(
        (e) => e.symbol == symbol && e.side == "Sell"
      ) == null &&
      absent_position_list.includes(1) &&
      !absent_position_list.includes(2)
    ) {
      await create_limit_order(coinObject.symbol, coinObject.tick_size, [1]);
    }

    // on_position_list에 3번 혹은 4번 거래가 없고, 3번만 걸려 있을 시 4번 거래 넣어줌.
    if (
      on_position_coin_list.find(
        (e) => e.symbol == symbol && e.side == "Buy"
      ) == null &&
      absent_position_list.includes(3) &&
      !absent_position_list.includes(4)
    ) {
      await create_limit_order(coinObject.symbol, coinObject.tick_size, [4]);
    }
  },

  check_position_order: async (symbol) => {
    for (const position of on_position_coin_list) {
      console.log("check_position_order123", position);
      if (position.symbol == symbol) {
        const current_price = await get_current_price(symbol);

        console.log("current_price :", current_price);
        console.log("Date.now() - position.time", Date.now() - position.time);

        // 해당하는 포지션 작업이 왔다면, 설정파일에 있는 시간를 체크함
        if (
          Date.now() - position.time >
          TRADE.close_position.close_position_time * 1000
        ) {
          // 설정파일에서 설정한 시간이 지났다면 포지션 정리
          await close_one_position(symbol, position.side);
        } else if (
          (position.side == "Sell" &&
            current_price <
              position.price -
                position.price *
                  TRADE.close_position.profit.profit_percentage) ||
          (position.side == "Buy" &&
            current_price >
              position.price +
                position.price * TRADE.close_position.profit.profit_percentage)
        ) {
          // 만약 롱과 숏이 설정해놓은 퍼샌테이지 이상의 익절 상태라면,
          await close_one_position(symbol, position.side);
        }
      }
    }
  },
};
