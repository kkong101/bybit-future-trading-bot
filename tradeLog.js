const fs = require("fs");
const { getAxios } = require("./axios/index");
const TRADE_LOG = require("./TRADE_LOG.json");

const getHistoryLog = async () => {
  // 한국 시간은 10시간 더 빠름.
  const time_diff = 1000 * 60 * 60 * 10;

  const start_config_time = TRADE_LOG.start_date;
  const end_config_time = TRADE_LOG.end_date;

  const start_date_time = start_config_time.split(" ");
  const start_date = start_date_time[0].split("/");
  const start_time = start_date_time[1].split(":");

  const end_date_time = end_config_time.split(" ");
  const end_date = end_date_time[0].split("/");
  const end_time = end_date_time[1].split(":");

  const start_time_format = new Date(
    `${start_date[0]}-${start_date[1]}-${start_date[2]}T${start_time[0]}:${start_time[1]}:${start_time[2]}.000Z`
  );
  const end_time_format = new Date(
    `${end_date[0]}-${end_date[1]}-${end_date[2]}T${end_time[0]}:${end_time[1]}:${end_time[2]}.000Z`
  );

  const res = await getAxios("/private/linear/trade/closed-pnl/list", {
    symbol: "SOLUSDT",
    start_time: start_time_format.getTime(),
    end_time: end_time_format.getTime(),
  });

  console.log(res);

  console.log("시작", start_time_format.getTime() * 1000);
  console.log("서버", res.time_now.split(".").join(""));
  console.log("종료", end_time_format.getTime() * 1000);

  // console.log(res);

  // const historyList= [];

  // if (res?.res_code == 0) {
  //   for (const history of res.result.data) {
  //     historyList.push({

  //     })
  //   }
  // }

  // console.log(res.result.data);
  // const content = "Hello World";
  // fs.writeFileSync("./result.txt", content, (err) => {
  //   if (err) {
  //     console.error(err);
  //     return;
  //   }
  // });
};

getHistoryLog();
