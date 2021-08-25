(function (window, document) {
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
  const calcFloor = Math.floor;

  function Candlestick(el) {
    this.$el = typeof el == 'object' ? el : document.getElementById(el);
    this.$el.style.position = 'relative';
    this.$canvas = null;
    this.$ctx = null;
    this.option = {
      style: {
        padding: 32,
        backgroundColor: '#fff',
        fontFamily: 'sans-serif',
        fontWeight: 400,
        fontSize: 12,
        lineHeight: 1.4
      },
      data: [],
      xAxis: {
        data: [],
        paddingTop: 4,
        color: '#888',
        borderColor: '#ccc'
      },
      yAxis: {
        paddingRight: 12,
        color: '#888',
        borderColor: '#ddd',
        interval: 5
      },
      series: {
        width: 0.6
      },
      axisPointer: {
        borderColor: '#888',
        lineDash: [4, 4],
        fontSize: 12,
        color: '#fff',
        backgroundColor: '#666',
        fontFamily: 'sans-serif',
        fontWeight: 400,
        lineHeight: 1,
        padding: 4,
        xMarginTop: 8,
        yMarginRight: 8
      },
      tooltip: {
        padding: 16,
        offset: 16,
        title: {
          color: '#666',
          marginBottom: 8,
          fontSize: 16,
          data: ['开盘价', '收盘价', '最低价', '最高价']
        },
        item: {
          color: '#666',
          marginBottom: 4
        },
        value: {
          fontWeight: 700,
          marginLeft: 16,
          color: '#333',
          fontFamily: 'Consolas,Monaco,monospace'
        }
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
    this.splitData(option);
    this.draw();
  };

  Candlestick.prototype.splitData = function (option) {
    let xAxisData = [];
    let values = [];
    for (let i = 0; i < option.data.length; i++) {
      xAxisData.push(option.data[i].splice(0, 1)[0]);
      values.push(option.data[i]);
    }

    // 合并option
    this.option = deepMerge(this.option, option);
    this.option.xAxis.data = xAxisData;
    this.option.data = values;
    this.len = this.option.data.length;
  };

  Candlestick.prototype.draw = function () {
    this.$ctx.clearRect(0, 0, this.$el.clientWidth, this.$el.clientHeight);
    this.$ctx.fillStyle = this.option.style.backgroundColor;
    this.$ctx.fillRect(0, 0, this.$el.clientWidth, this.$el.clientHeight);
    this.$ctx.font = `${this.option.style.fontWeight} ${this.option.style.fontSize}px ${this.option.style.fontFamily}`;

    this.drawYAxis();
    this.drawXAxis();
    this.drawCandle();
    this.setIndicator();
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
      let intervalValue = (minValue + (i * (maxValue - minValue)) / this.option.yAxis.interval).toFixed(2);
      labelArray.push(intervalValue);
    }
    labelArray.push(maxValue.toFixed(2));

    let labelWidth = this.$ctx.measureText(`${maxValue.toFixed(2)}`).width;
    let labelHeight = this.option.style.fontSize * this.option.style.lineHeight;

    this.labelWidth = labelWidth;
    this.labelHeight = labelHeight;

    this.$ctx.strokeStyle = this.option.yAxis.borderColor;
    this.rowHeight =
      (this.$el.clientHeight - labelHeight - this.option.xAxis.paddingTop - this.option.style.padding * 2) /
      this.option.yAxis.interval;

    this.seriesLeft = this.option.style.padding + labelWidth + this.option.yAxis.paddingRight;
    this.seriesBottom = this.option.style.padding + labelHeight + this.option.xAxis.paddingTop;

    //y轴标签和分割线
    for (let i = 1; i <= this.option.yAxis.interval; i++) {
      // 调整坐标系原点;
      this.$ctx.save();
      this.$ctx.translate(0, this.$el.clientHeight);
      this.$ctx.scale(1, -1);

      this.$ctx.beginPath();
      this.$ctx.moveTo(this.seriesLeft, i * this.rowHeight + this.seriesBottom);
      this.$ctx.lineTo(this.$el.clientWidth - this.option.style.padding, i * this.rowHeight + this.seriesBottom);
      this.$ctx.stroke();
      this.$ctx.closePath();

      this.$ctx.restore();

      this.$ctx.textAlign = 'right';
      this.$ctx.textBaseline = 'middle';
      this.$ctx.fillStyle = this.option.yAxis.color;
      this.$ctx.fillText(
        `${labelArray[i]}`,
        this.seriesLeft - this.option.yAxis.paddingRight,
        this.$el.clientHeight - this.seriesBottom - i * this.rowHeight
      );
    }
    //最大值刻度
    this.$ctx.fillText(
      `${labelArray[0]}`,
      this.seriesLeft - this.option.yAxis.paddingRight,
      this.$el.clientHeight - this.seriesBottom
    );
  };

  // x轴
  Candlestick.prototype.drawXAxis = function () {
    this.$ctx.strokeStyle = this.option.xAxis.borderColor;

    // 调整坐标系原点;
    this.$ctx.save();
    this.$ctx.translate(0, this.$el.clientHeight);
    this.$ctx.scale(1, -1);

    this.$ctx.beginPath();
    this.$ctx.moveTo(this.seriesLeft, this.seriesBottom);
    this.$ctx.lineTo(this.$el.clientWidth - this.option.style.padding, this.seriesBottom);
    this.$ctx.stroke();
    this.$ctx.closePath();

    this.$ctx.restore();

    this.$ctx.textAlign = 'left';
    this.$ctx.fillText(
      `${this.option.xAxis.data[0]}`,
      this.seriesLeft,
      this.$el.clientHeight - this.seriesBottom + this.labelHeight + this.option.xAxis.paddingTop
    );

    this.$ctx.fillText(
      `${this.option.xAxis.data[this.len - 1]}`,
      this.$el.clientWidth -
        this.$ctx.measureText(this.option.xAxis.data[this.len - 1]).width -
        this.option.style.padding,
      this.$el.clientHeight - this.seriesBottom + this.labelHeight + this.option.xAxis.paddingTop
    );
  };

  Candlestick.prototype.drawCandle = function () {
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

      // 画矩形
      this.$ctx.fillRect(x, y, width, height);

      // 画线
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

  Candlestick.prototype.setIndicator = function () {
    let self = this;
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    let width = this.$el.clientWidth;
    let height = this.$el.clientHeight;
    canvas.innerText = '当前浏览器不支持canvas';
    canvas = createHiDPICanvas(canvas, width, height);
    canvas.style.position = 'absolute';
    canvas.style.top = '0px';
    canvas.style.left = '0px';

    let tooltip = document.createElement('div');
    tooltip.style.display = 'block';
    tooltip.style.visibility = 'hidden';
    tooltip.style.backgroundColor = '#fff';
    tooltip.style.font = '14px / 20px sans-serif';
    tooltip.style.fontVariantNumeric = 'tabular-nums';
    tooltip.style.whiteSpace = 'nowrap';
    tooltip.style.borderRadius = '4px';
    tooltip.style.position = 'absolute';
    tooltip.style.left = '0px';
    tooltip.style.top = '0px';
    tooltip.style.zIndex = '999999999';
    tooltip.style.opacity = '0';
    tooltip.style.padding = '16px';
    tooltip.style.willChange = 'transform';
    tooltip.style.transition =
      'opacity 0.2s cubic-bezier(0.23, 1, 0.32, 1) 0s, visibility 0.2s cubic-bezier(0.23, 1, 0.32, 1) 0s, transform 0.4s cubic-bezier(0.23, 1, 0.32, 1) 0s';
    tooltip.style.boxShadow = 'rgba(0, 0, 0, 0.2) 1px 2px 10px';

    self.$el.addEventListener('mouseover', start);
    document.addEventListener('mouseout', end);

    function start(e) {
      e.preventDefault();
      e.stopPropagation();

      document.addEventListener('mousemove', move);
    }

    function move(e) {
      e.preventDefault();
      e.stopPropagation();

      let mouseX = e.pageX;
      let mouseY = e.pageY;
      let left = mouseX - self.$el.offsetLeft;
      let top = mouseY - self.$el.offsetTop;

      ctx.clearRect(0, 0, self.$el.clientWidth, self.$el.clientHeight);

      // 判断鼠标位置是否在k线图坐标系内
      if (
        left > self.seriesLeft &&
        left < self.$el.clientWidth - self.option.style.padding &&
        top > self.option.style.padding &&
        top < self.$el.clientHeight - self.seriesBottom
      ) {
        let currentInedx = calcFloor((left - self.seriesLeft) / self.colWidth);
        let xAxisValue = self.option.xAxis.data[currentInedx];
        let currentData = self.option.data[currentInedx];

        ctx.strokeStyle = self.option.axisPointer.borderColor;
        ctx.setLineDash(self.option.axisPointer.lineDash);
        // 横线
        ctx.beginPath();
        ctx.moveTo(self.seriesLeft, top);
        ctx.lineTo(self.$el.clientWidth - self.option.style.padding, top);
        ctx.stroke();
        ctx.closePath();
        // 竖线
        ctx.beginPath();
        ctx.moveTo(left, self.option.style.padding);
        ctx.lineTo(left, self.$el.clientHeight - self.seriesBottom);
        ctx.stroke();
        ctx.closePath();

        // x轴标签
        ctx.font = `${self.option.axisPointer.fontWeight} ${self.option.axisPointer.fontSize}px ${self.option.axisPointer.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = self.option.axisPointer.backgroundColor;

        let xLabelWidth = ctx.measureText(xAxisValue).width + self.option.axisPointer.padding * 2;
        let xBacPosX = left - xLabelWidth / 2;
        if (xBacPosX < self.seriesLeft) {
          xBacPosX = self.seriesLeft;
        }
        if (xBacPosX > self.$el.clientWidth - self.option.style.padding - xLabelWidth) {
          xBacPosX = self.$el.clientWidth - self.option.style.padding - xLabelWidth;
        }
        let yBacPosX = self.$el.clientHeight - self.seriesBottom + self.option.axisPointer.xMarginTop;
        let xBacWidth = xLabelWidth;
        let xBacHeight =
          self.option.axisPointer.fontSize * self.option.axisPointer.lineHeight + self.option.axisPointer.padding * 2;

        ctx.fillRect(xBacPosX, yBacPosX, xBacWidth, xBacHeight);

        ctx.fillStyle = self.option.axisPointer.color;
        ctx.fillText(
          xAxisValue,
          xBacPosX + self.option.axisPointer.padding,
          yBacPosX +
            self.option.axisPointer.padding +
            (self.option.axisPointer.fontSize * self.option.axisPointer.lineHeight) / 2
        );

        // y轴标签
        let yAxisValue = (
          ((self.$el.clientHeight - top - self.seriesBottom) /
            (self.$el.clientHeight - self.seriesBottom - self.option.style.padding)) *
            self.relativeHeight +
          self.minValue
        ).toFixed(2);

        let yLabelWidth = ctx.measureText(yAxisValue).width + self.option.axisPointer.padding * 2;
        let xBacPosY = self.seriesLeft - yLabelWidth - self.option.axisPointer.yMarginRight;
        let yBacPosY =
          top - self.option.axisPointer.fontSize * self.option.axisPointer.lineHeight + self.option.axisPointer.padding;
        let yBacWidth = yLabelWidth;
        let yBacHeight =
          self.option.axisPointer.fontSize * self.option.axisPointer.lineHeight + self.option.axisPointer.padding * 2;

        ctx.fillStyle = self.option.axisPointer.backgroundColor;
        ctx.fillRect(xBacPosY, yBacPosY, yBacWidth, yBacHeight);

        ctx.fillStyle = self.option.axisPointer.color;
        ctx.fillText(
          yAxisValue,
          xBacPosY + self.option.axisPointer.padding,
          yBacPosY +
            self.option.axisPointer.padding +
            (self.option.axisPointer.fontSize * self.option.axisPointer.lineHeight) / 2
        );

        let titleStyle = `color: ${self.option.tooltip.title.color}; margin-bottom: ${self.option.tooltip.title.marginBottom}px; font-size: ${self.option.tooltip.title.fontSize}px`;
        let itemStyle = `color: ${self.option.tooltip.item.color}; margin-bottom: ${self.option.tooltip.item.marginBottom}px`;
        let lastItemStyle = `color: ${self.option.tooltip.item.color}`;
        let valueStyle = `font-weight: ${self.option.tooltip.value.fontWeight}; margin-left: ${self.option.tooltip.value.marginLeft}px; float: right; color: ${self.option.tooltip.value.color}; font-family: ${self.option.tooltip.value.fontFamily}`;

        // 设置tooltip中的内容
        tooltip.innerHTML = `
        <div style="${titleStyle}">${xAxisValue}</div>
        <div style="${itemStyle}">${
          self.option.tooltip.title.data[0]
        }: <span style="${valueStyle}">${currentData[0].toFixed(2)}</span></div>
        <div style="${itemStyle}">${
          self.option.tooltip.title.data[1]
        }: <span style="${valueStyle}">${currentData[1].toFixed(2)}</span></div>
        <div style="${itemStyle}">${
          self.option.tooltip.title.data[2]
        }: <span style="${valueStyle}">${currentData[2].toFixed(2)}</span></div>
        <div style="${lastItemStyle}">${
          self.option.tooltip.title.data[3]
        }: <span style="${valueStyle}">${currentData[3].toFixed(2)}</span></div>
        `;
        tooltip.style.transform = `translate3D(${
          left + tooltip.clientWidth > self.$el.clientWidth - self.option.style.padding
            ? left - tooltip.clientWidth - self.option.tooltip.offset
            : left + self.option.tooltip.offset
        }px, ${
          top - self.option.style.padding < tooltip.clientHeight
            ? top + self.option.tooltip.offset
            : top - tooltip.clientHeight - self.option.tooltip.offset
        }px, 0px)`;
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
      } else {
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
        ctx.clearRect(0, 0, self.$el.clientWidth, self.$el.clientHeight);
      }
    }

    function end(e) {
      tooltip.style.opacity = '0';
      tooltip.style.visibility = 'hidden';
      ctx.clearRect(0, 0, self.$el.clientWidth, self.$el.clientHeight);
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseout', end);
    }

    self.$el.appendChild(canvas);
    self.$el.appendChild(tooltip);
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
})(window, document);
