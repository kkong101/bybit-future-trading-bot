module.exports = {
  trade: {
    total_money: 0.0,
    leverage: 1,
    using_money_rate: 1,
    is_onPosition: false,
  },
  coin_info: [],
  /**
   * {
      symbol: 'BTCUSDT',
      tick_size: '0.5',
      min_price: '0.5',
      min_trading_qty: 0.001,
      qty_step: 0.001
      order: [
          {
            id: order.order_id,
            side: position,
            price: parseFloat(order.price),
            qty: 213
          },
      ]
      previous_price: 0,
      current_price: 0,
      prev_upper: 0.23443,
      prev_lower: 0.23234,
      up_or_down: "up"
    }
   */
  on_position_coin_list: [],
  /**
   * {
      symbol: symbol,
      side: position.side,
      price: parseFloat(position.entry_price),
      qty: parseFloat(position.size),
      initial_qty: parseFloat(position.size),
      time: Date.now(),
      liq_price: parseFloat(position.liq_price),
    }
   */
  queue: [],
};
