(function () {
  const PIXEL_RATIO = (function () {
    const canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d'),
      dpr = window.devicePixelRatio || 1,
      bsr =
        ctx['webkitBackingStorePixelRatio'] ||
        ctx['mozBackingStorePixelRatio'] ||
        ctx['msBackingStorePixelRatio'] ||
        ctx['oBackingStorePixelRatio'] ||
        ctx['backingStorePixelRatio'] ||
        1;

    return dpr / bsr;
  })();

  const findMax = Math.max;
  const findMin = Math.min;
  const calcAbs = Math.abs;

  function Candlestick(el) {
    this.$el = typeof el == 'object' ? el : document.getElementById(el);
    this.$canvas = null;
    this.$ctx = null;
    this.option = {
      style: {
        padding: 24,
        backgroundColor: '#fff',
        fontFamily: 'sans-serif',
        fontWeight: 400,
        fontSize: 12,
        lineHeight: 1.4
      },
      xAxis: {
        paddingTop: 8,
        color: '#666',
        borderColor: '#bbb'
      },
      yAxis: {
        paddingRight: 12,
        color: '#666',
        borderColor: '#ddd',
        interval: 5
      },
      series: {
        width: 0.6
      },
      color: {
        increase: '#eb5454',
        decrease: '#47b262'
      }
    };

    this.init();
  }

  Candlestick.prototype.init = function () {
    let canvas = document.createElement('canvas');
    let width = this.$el.clientWidth;
    let height = this.$el.clientHeight;
    canvas.innerText = '当前浏览器不支持canvas';
    canvas = createHiDPICanvas(canvas, width, height);
    this.$canvas = canvas;
    this.$ctx = canvas.getContext('2d');
    this.$el.appendChild(canvas);
  };

  Candlestick.prototype.setOption = function (option) {
    this.option = deepMerge(this.option, option);
    this.splitData();
    this.calcSpace();
    this.draw();
  };

  Candlestick.prototype.splitData = function (data) {
    return data;
  };

  Candlestick.prototype.calcSpace = function () {};

  Candlestick.prototype.draw = function () {
    this.$ctx.clearRect(0, 0, this.$el.clientWidth, this.$el.clientHeight);
    this.$ctx.fillStyle = this.option.style.backgroundColor;
    this.$ctx.fillRect(0, 0, this.$el.clientWidth, this.$el.clientHeight);
    this.$ctx.font = `${this.option.style.fontWeight} ${this.option.style.fontSize}px ${this.option.style.fontFamily}`;

    this.drawYAxis();
    this.drawXAxis();
    this.drawCandle();
  };

  // y轴
  Candlestick.prototype.drawYAxis = function () {
    let maxValue, minValue;
    let maxArray = [],
      minArray = [],
      labelArray = [];

    this.option.data.forEach(item => {
      maxArray.push(item[3]);
      minArray.push(item[2]);
    });

    maxValue = findMax(...maxArray);
    minValue = findMin(...minArray);

    this.maxValue = maxValue;
    this.minValue = minValue;

    this.relativeHeight = maxValue - minValue;

    for (let i = 0; i < this.option.yAxis.interval; i++) {
      let intervalValue = (
        minValue +
        (i * (maxValue - minValue)) / this.option.yAxis.interval
      ).toFixed(2);
      labelArray.push(intervalValue);
    }
    labelArray.push(maxValue.toFixed(2));

    let labelWidth = this.$ctx.measureText(`${maxValue.toFixed(2)}`).width;
    let labelHeight = this.option.style.fontSize * this.option.style.lineHeight;

    this.labelWidth = labelWidth;
    this.labelHeight = labelHeight;

    this.$ctx.strokeStyle = this.option.yAxis.borderColor;
    this.rowHeight =
      (this.$el.clientHeight -
        labelHeight -
        this.option.xAxis.paddingTop -
        this.option.style.padding * 2) /
      this.option.yAxis.interval;

    this.seriesLeft = this.option.style.padding + labelWidth + this.option.yAxis.paddingRight;
    this.seriesBottom = this.option.style.padding + labelHeight + this.option.xAxis.paddingTop;

    //y轴标签和分割线
    for (let i = 1; i <= this.option.yAxis.interval; i++) {
      // 调整坐标系原点到左下角;
      this.$ctx.save();
      this.$ctx.translate(0, this.$el.clientHeight);
      this.$ctx.scale(1, -1);

      this.$ctx.beginPath();
      this.$ctx.moveTo(this.seriesLeft, i * this.rowHeight + this.seriesBottom);
      this.$ctx.lineTo(
        this.$el.clientWidth - this.option.style.padding,
        i * this.rowHeight + this.seriesBottom
      );
      this.$ctx.stroke();
      this.$ctx.closePath();

      this.$ctx.restore();

      this.$ctx.textAlign = 'right';
      this.$ctx.fillStyle = this.option.yAxis.color;
      this.$ctx.fillText(
        `${labelArray[i]}`,
        this.seriesLeft - this.option.yAxis.paddingRight,
        this.$el.clientHeight - this.seriesBottom - i * this.rowHeight + labelHeight / 4
      );
    }
    this.$ctx.fillText(
      `${labelArray[0]}`,
      this.seriesLeft - this.option.yAxis.paddingRight,
      this.$el.clientHeight - this.seriesBottom + labelHeight / 4
    );
  };

  // x轴
  Candlestick.prototype.drawXAxis = function () {
    this.$ctx.strokeStyle = this.option.xAxis.borderColor;

    // 调整坐标系原点到左下角;
    this.$ctx.save();
    this.$ctx.translate(0, this.$el.clientHeight);
    this.$ctx.scale(1, -1);

    this.$ctx.beginPath();
    this.$ctx.moveTo(this.seriesLeft, this.seriesBottom);
    this.$ctx.lineTo(this.$el.clientWidth - this.option.style.padding, this.seriesBottom);
    this.$ctx.stroke();
    this.$ctx.closePath();

    this.$ctx.restore();
  };

  Candlestick.prototype.drawCandle = function () {
    this.len = this.option.data.length;
    this.colWidth = (this.$el.clientWidth - this.seriesLeft - this.option.style.padding) / this.len;
    this.option.data.forEach(drawRect.bind(this));

    function drawRect(item, index) {
      let x = this.colWidth * index + this.colWidth * ((1 - this.option.series.width) / 2);
      let xLine = this.colWidth * index + this.colWidth * 0.5;
      let y =
        ((findMin(item[0], item[1]) - this.minValue) / this.relativeHeight) *
          (this.$el.clientHeight - this.seriesBottom - this.option.style.padding) +
        this.seriesBottom;
      let width = this.colWidth * this.option.series.width;
      let dValue = item[1] - item[0];
      if (dValue >= 0) {
        this.$ctx.fillStyle = this.option.color.increase;
        this.$ctx.strokeStyle = this.option.color.increase;
      } else {
        this.$ctx.fillStyle = this.option.color.decrease;
        this.$ctx.strokeStyle = this.option.color.decrease;
      }
      let height =
        (calcAbs(dValue) / this.relativeHeight) *
        (this.$el.clientHeight - this.seriesBottom - this.option.style.padding);

      // 调整坐标系原点;
      this.$ctx.save();
      this.$ctx.translate(this.seriesLeft, this.$el.clientHeight);
      this.$ctx.scale(1, -1);

      this.$ctx.fillRect(x, y, width, height);
      this.$ctx.beginPath();
      this.$ctx.moveTo(
        xLine,
        ((item[3] - this.minValue) / this.relativeHeight) *
          (this.$el.clientHeight - this.seriesBottom - this.option.style.padding) +
          this.seriesBottom
      );
      this.$ctx.lineTo(
        xLine,
        ((item[2] - this.minValue) / this.relativeHeight) *
          (this.$el.clientHeight - this.seriesBottom - this.option.style.padding) +
          this.seriesBottom
      );
      this.$ctx.stroke();
      this.$ctx.closePath();

      this.$ctx.restore();
    }
  };

  let candlestick = {};

  candlestick.init = function (el) {
    return new Candlestick(el);
  };

  function createHiDPICanvas(canvas, w, h, ratio) {
    if (!ratio) {
      ratio = PIXEL_RATIO;
    }
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    let ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return canvas;
  }

  function deepMerge(...objs) {
    const result = Object.create(null);

    objs.forEach(obj => {
      if (obj) {
        Object.keys(obj).forEach(key => {
          const val = obj[key];
          if (isPlainObject(val)) {
            if (isPlainObject(result[key])) {
              result[key] = deepMerge(result[key], val);
            } else {
              result[key] = deepMerge(val);
            }
          } else {
            result[key] = val;
          }
        });
      }
    });

    return result;
  }

  function isPlainObject(val) {
    return toString.call(val) === '[object Object]';
  }

  window.candlestick = candlestick;
})();
