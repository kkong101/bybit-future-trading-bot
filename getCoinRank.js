const { getAxios } = require("./axios/index");

const getKoreaTime = (ms) => {
  // ex ) 1655372640
  return new Date(parseInt(ms) * 1000 + 9 * 60 * 60 * 1000);
};

function sleep(ms) {
  const wakeUpTime = Date.now() + ms;
  while (Date.now() < wakeUpTime) {}
}

const start = async () => {
  // 코인 정보 불러오는 부분
  const coin_res = await getAxios("/v2/public/symbols");
  let coin_list = [];
  for (const e of coin_res.result) {
    if (e.quote_currency === "USDT") {
      coin_list.push(e.name);
    }
  }

  const time_res = await getAxios("/v2/public/time");
  const server_time = parseInt(time_res.time_now.substr(0, 10));

  const hour = 30; // 30시간
  let req_num = parseInt((hour * 60) / 200);
  if ((hour * 60) % 200 !== 0) {
    req_num++;
  }
  const list = [];
  const result_list = [];
  for (const symbol of coin_list) {
    for (let i = 0; i < req_num; i++) {
      const res = await getAxios("/public/linear/kline", {
        symbol: symbol,
        interval: 1,
        from: server_time - (i + 1) * 60 * 200,
      });
      list.push(...res.result);
      sleep(100);
    }

    const high_list = [];
    for (const tt of list) {
      const percentage =
        (Math.abs(parseFloat(tt.high) - parseFloat(tt.low)) /
          parseFloat(tt.high)) *
        100;
      if (percentage > 1) {
        high_list.push({
          time: getKoreaTime(tt.start_at),
          percentage: percentage,
        });
      }
    }
    result_list.push({
      symbol: symbol,
      num: high_list.length,
    });
  }

  result_list.sort((a, b) => {
    return b.num - a.num;
  });
  console.log(result_list);
};

start();
