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
        backgroundColor: '#fff'
      },
      xAxis: {
        paddingTop: 8,
        color: '#999'
      },
      yAxis: {
        paddingRight: 8,
        color: '#999'
      },
      color: {
        increase: '#da5e5a',
        decrease: '#65b06a'
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
    this.draw();
  };

  Candlestick.prototype.draw = function () {
    this.$ctx.clearRect(0, 0, this.$canvas.width, this.$canvas.height);

    // 调整坐标系原点到左下角
    this.$ctx.save();
    this.$ctx.translate(0, this.$el.clientHeight);
    this.$ctx.scale(1, -1);

    this.drawXAxis();
    this.drawYAxis();
    this.drawCandle();

    this.$ctx.restore();
  };

  Candlestick.prototype.drawXAxis = function () {
    this.len = this.option.data.length;
    this.colWidth = this.$el.clientWidth / this.len;

    // x轴
    this.$ctx.beginPath();
    this.$ctx.moveTo(0, 0);
    this.$ctx.lineTo(this.$el.clientWidth, 0);
    this.$ctx.stroke();
    this.$ctx.closePath();
  };

  Candlestick.prototype.drawYAxis = function () {
    let maxValue, minValue;
    let maxArray = [],
      minArray = [];

    this.option.data.forEach(item => {
      maxArray.push(item[3]);
      minArray.push(item[2]);
    });

    maxValue = findMax(...maxArray);
    minValue = findMin(...minArray);
    this.relativeHeight = maxValue - minValue;

    this.$ctx.strokeStyle = '#ddd';
    this.rowHeight = this.$el.clientHeight / 5;
    //y轴分割线
    for (let i = 1; i <= 5; i++) {
      this.$ctx.beginPath();
      this.$ctx.moveTo(0, i * this.rowHeight);
      this.$ctx.lineTo(this.$el.clientWidth, i * this.rowHeight);
      this.$ctx.stroke();
      this.$ctx.closePath();
    }
  };

  Candlestick.prototype.drawCandle = function () {
    this.option.data.forEach(drawRect.bind(this));

    function drawRect(item, index) {
      let x = this.colWidth * index + this.colWidth * 0.25;
      let xLine = this.colWidth * index + this.colWidth * 0.5;
      let y = (findMin(item[0], item[1]) / this.relativeHeight) * this.$el.clientHeight;
      let width = this.colWidth * 0.5;
      let dValue = item[1] - item[0];
      if (dValue >= 0) {
        this.$ctx.fillStyle = this.option.color.increase;
        this.$ctx.strokeStyle = this.option.color.increase;
      } else {
        this.$ctx.fillStyle = this.option.color.decrease;
        this.$ctx.strokeStyle = this.option.color.decrease;
      }
      let height = (calcAbs(dValue) / this.relativeHeight) * this.$el.clientHeight;
      this.$ctx.fillRect(x, y, width, height);

      this.$ctx.beginPath();
      this.$ctx.moveTo(xLine, (item[3] / this.relativeHeight) * this.$el.clientHeight);
      this.$ctx.lineTo(xLine, (item[2] / this.relativeHeight) * this.$el.clientHeight);
      this.$ctx.stroke();
      this.$ctx.closePath();
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
    canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
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
