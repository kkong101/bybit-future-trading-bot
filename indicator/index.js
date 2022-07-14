const { white_list } = require("../COINS.json");
const { getAxios } = require("../http/index");
const { findCoinInfo } = require("../utils/index");
const BB = require("technicalindicators").BollingerBands;
const EMA = require("technicalindicators").EMA;

module.exports = {
  /**
   * 볼린저 밴드 지표 가격정보를 세팅해줌.
   * @param {*} symbol
   */
  setBBInfo: async (symbol) => {
    const local_time = parseInt(new Date().getTime() / 1000);

    const res = await getAxios("/public/linear/kline", {
      symbol: symbol,
      interval: 1,
      from: local_time - 3000,
    });
    const values = [];
    for (const history of res.result) {
      values.push(history.close);
    }

    const coinInfo = white_list.find((e) => e.symbol === symbol);
    const coinObj = findCoinInfo(symbol);

    if (coinInfo === null || coinObj === null) return;

    // ####### up_or_down 설정하는 부분 #########
    const ema30 = EMA.calculate({
      period: 25,
      values: values,
    });
    const ema6 = EMA.calculate({
      period: 6,
      values: values,
    });
    const curr_ema30 = ema30[ema30.length - 1];
    const curr_ema6 = ema6[ema6.length - 1];

    if (curr_ema30 - curr_ema6 < 0) {
      coinObj.up_or_down = "down";
    } else {
      coinObj.up_or_down = "up";
    }
    // ####### up_or_down 설정하는 부분 #########

    // 현재 close 가격은 빼준다.
    values.pop();

    const input = {
      period: coinInfo.indicator_period,
      values: values,
      stdDev: coinInfo.indicator_stdDev,
    };
    const BB_result = BB.calculate(input);

    coinObj.prev_upper = BB_result[BB_result.length - 2].upper;
    coinObj.prev_lower = BB_result[BB_result.length - 2].lower;
  },
  setUpDownPosition: async (symbol) => {},
};
