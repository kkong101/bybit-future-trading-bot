const { white_list } = require("../COINS.json");
const { getAxios } = require("../http/index");
const { findCoinInfo, isWellContacted } = require("../utils/index");
const BB = require("technicalindicators").BollingerBands;
const EMA = require("technicalindicators").EMA;

module.exports = {
  /**
   * 볼린저 밴드 지표 가격정보를 세팅해줌.
   * @param {*} symbol
   */
  setBBInfo: async (symbol) => {
    console.log("setBBInfo start");
    const local_time = parseInt(new Date().getTime() / 1000);

    const res = await getAxios("/public/linear/kline", {
      symbol: symbol,
      interval: 1,
      from: local_time - 3000,
    });
    if (!isWellContacted(res)) return;
    const values = [];
    for (const history of res.result) {
      values.push(history.close);
    }

    const coinInfo = white_list.find((e) => e.symbol === symbol);
    const coinObj = findCoinInfo(symbol);

    if (coinInfo === null || coinObj === null) return;

    const input = {
      period: coinInfo.indicator_period,
      values: values,
      stdDev: coinInfo.indicator_stdDev,
    };
    const BB_result = BB.calculate(input);

    coinObj.prev_upper = BB_result[BB_result.length - 2].upper;
    coinObj.prev_lower = BB_result[BB_result.length - 2].lower;

    // ####### EMA 설정하는 부분 #########
    const ema30 = EMA.calculate({
      period: 30,
      values: values,
    });
    const ema6 = EMA.calculate({
      period: 6,
      values: values,
    });

    coinObj.prev_slow_ema = ema30[ema30.length - 2];
    coinObj.prev_fast_ema = ema6[ema6.length - 2];
    // ####### EMA 설정하는 부분 #########
  },
  setUpDownPosition: async (symbol) => {
    console.log("setUpDownPosition start");
    const coinObj = findCoinInfo(symbol);
    if (coinObj === null) return;

    const slow_alpha = 2 / 31;
    const fast_alpha = 2 / 7;

    const curr_slow_ema =
      coinObj.prev_slow_ema * (1 - slow_alpha) +
      coinObj.current_price * slow_alpha;
    const curr_fast_ema =
      coinObj.prev_fast_ema * (1 - fast_alpha) +
      coinObj.current_price * fast_alpha;
    console.log("#### coinObj.current_price", coinObj.current_price);
    console.log("#### curr_slow_ema", curr_slow_ema);
    console.log("#### curr_fast_ema", curr_fast_ema);
    if (curr_slow_ema < curr_fast_ema) {
      coinObj.up_or_down = "up";
    } else {
      coinObj.up_or_down = "down";
    }
  },
};
