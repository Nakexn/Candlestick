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

  const tween = {
    ease: function (t, b, c, d) {
      return -c * ((t = t / d - 1) * t * t * t - 1) + b;
    },
    'ease-in': function (t, b, c, d) {
      return c * (t /= d) * t * t + b;
    },
    'ease-out': function (t, b, c, d) {
      return c * ((t = t / d - 1) * t * t + 1) + b;
    },
    'ease-in-out': function (t, b, c, d) {
      if ((t /= d / 2) < 1) return (c / 2) * t * t * t + b;
      return (c / 2) * ((t -= 2) * t * t + 2) + b;
    }
  };

  let lasttime = 0;
  const nextFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
      let curtime = +new Date(),
        delay = Math.max(1000 / 60, 1000 / 60 - (curtime - lasttime));
      lasttime = curtime + delay;
      return setTimeout(callback, delay);
    };

  const cancelFrame =
    window.cancelAnimationFrame ||
    window.webkitCancelAnimationFrame ||
    window.mozCancelAnimationFrame ||
    window.msCancelAnimationFrame ||
    clearTimeout;

  function Candlestick(el) {
    this.$el = typeof el == 'object' ? el : document.getElementById(el);
    this.$el.style.position = 'relative';
    this.width = getWidth(this.$el);
    this.height = getHeight(this.$el);
    this.option = {
      style: {
        padding: 32,
        backgroundColor: '#fff',
        fontFamily: 'sans-serif',
        fontWeight: 400,
        fontSize: 12,
        lineHeight: 1
      },
      data: [],
      line: {
        MA5: {
          data: [],
          style: {
            width: 2,
            borderColor: '#708cde',
            dot: {
              backgroundColor: '#fff',
              width: 4,
              borderColor: '#708cde',
              borderWidth: 2
            }
          }
        }
      },
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
        lineDash: [4, 2],
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
        backgroundColor: '#fff',
        font: '14px / 20px sans-serif',
        zIndex: 999999,
        borderRadius: 4,
        boxShadow: 'rgba(0, 0, 0, 0.2) 1px 2px 10px',
        title: {
          color: '#666',
          marginBottom: 8,
          fontSize: 16,
          data: ['开盘价', '收盘价', '最低价', '最高价']
        },
        item: {
          color: '#444',
          marginBottom: 4
        },
        value: {
          fontWeight: 700,
          marginLeft: 16,
          color: '#444',
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
    canvas.innerText = '当前浏览器不支持canvas';
    canvas = createHiDPICanvas(canvas, this.width, this.height);
    this.$canvas = canvas;
    this.$ctx = canvas.getContext('2d');
    this.$el.appendChild(canvas);
  };

  Candlestick.prototype.setOption = function (option) {
    this.splitData(option);
    this.calculateMA5();
    this.calculateProps();
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

  Candlestick.prototype.calculateMA5 = function () {
    this.option.line.MA5.data = calculateMA(this.option.data, 5);
  };

  Candlestick.prototype.calculateProps = function () {
    const ctx = this.$ctx;
    const style = this.option.style;
    const data = this.option.data;
    const xAxis = this.option.xAxis;
    const yAxis = this.option.yAxis;
    let maxValue, minValue;
    let maxArray = [],
      minArray = [];

    data.forEach(item => {
      maxArray.push(item[3]);
      minArray.push(item[2]);
    });

    maxValue = findMax(...maxArray);
    minValue = findMin(...minArray);

    // 最大值、最小值、相对高度
    this.maxValue = maxValue;
    this.minValue = minValue;
    this.relativeHeight = maxValue - minValue;

    ctx.font = `${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;

    // 坐标轴标签的宽高
    this.labelWidth = ctx.measureText(`${maxValue.toFixed(2)}`).width;
    this.labelHeight = style.fontSize * style.lineHeight;

    // 坐标系上下左右与容器的距离
    this.seriesLeft = style.padding + this.labelWidth + yAxis.paddingRight;
    this.seriesBottom = style.padding + this.labelHeight + xAxis.paddingTop;
    this.seriesTop = style.padding;
    this.seriesRight = style.padding;

    // 坐标系行高与列宽
    this.rowHeight = (this.height - this.labelHeight - xAxis.paddingTop - style.padding * 2) / yAxis.interval;
    this.colWidth = (this.width - this.seriesLeft - style.padding) / this.len;
  };

  Candlestick.prototype.draw = function () {
    const ctx = this.$ctx;
    const style = this.option.style;

    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawYAxis();
    this.drawXAxis();
    this.drawCandle();
    setTimeout(() => {
      this.drawLine.call(this);
    }, 1000);
    this.setIndicator();
  };

  // y轴
  Candlestick.prototype.drawYAxis = function () {
    const yAxis = this.option.yAxis;
    const style = this.option.style;
    const el = this.$el;
    const ctx = this.$ctx;
    let labelArray = [];
    let maxValue = this.maxValue;
    let minValue = this.minValue;
    let relativeHeight = this.relativeHeight;

    for (let i = 0; i < yAxis.interval; i++) {
      let intervalValue = (minValue + (i * relativeHeight) / yAxis.interval).toFixed(2);
      labelArray.push(intervalValue);
    }
    labelArray.push(maxValue.toFixed(2));

    ctx.strokeStyle = yAxis.borderColor;

    //y轴标签和分割线
    for (let i = 1; i <= yAxis.interval; i++) {
      // 调整坐标系原点;
      ctx.save();
      ctx.translate(0, this.height);
      ctx.scale(1, -1);

      ctx.beginPath();
      ctx.moveTo(this.seriesLeft, i * this.rowHeight + this.seriesBottom);
      ctx.lineTo(el.clientWidth - style.padding, i * this.rowHeight + this.seriesBottom);
      ctx.stroke();
      ctx.closePath();

      ctx.restore();

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = yAxis.color;
      ctx.fillText(
        `${labelArray[i]}`,
        this.seriesLeft - yAxis.paddingRight,
        el.clientHeight - this.seriesBottom - i * this.rowHeight
      );
    }
    //最大值刻度
    ctx.fillText(`${labelArray[0]}`, this.seriesLeft - yAxis.paddingRight, el.clientHeight - this.seriesBottom);
  };

  // x轴
  Candlestick.prototype.drawXAxis = function () {
    const el = this.$el;
    const ctx = this.$ctx;
    const style = this.option.style;
    const xAxis = this.option.xAxis;

    ctx.strokeStyle = this.option.xAxis.borderColor;

    // 调整坐标系原点;
    this.$ctx.save();
    this.$ctx.translate(0, this.$el.clientHeight);
    this.$ctx.scale(1, -1);

    this.$ctx.beginPath();
    this.$ctx.moveTo(this.seriesLeft, this.seriesBottom);
    this.$ctx.lineTo(this.width - style.padding, this.seriesBottom);
    this.$ctx.stroke();
    this.$ctx.closePath();

    this.$ctx.restore();

    this.$ctx.textAlign = 'left';
    this.$ctx.fillText(
      `${xAxis.data[0]}`,
      this.seriesLeft,
      this.height - this.seriesBottom + this.labelHeight + xAxis.paddingTop
    );

    this.$ctx.fillText(
      `${this.option.xAxis.data[this.len - 1]}`,
      this.width - this.$ctx.measureText(xAxis.data[this.len - 1]).width - style.padding,
      this.height - this.seriesBottom + this.labelHeight + xAxis.paddingTop
    );
  };

  Candlestick.prototype.drawCandle = function () {
    const data = this.option.data;
    const series = this.option.series;
    const color = this.option.color;
    const xAxis = this.option.xAxis;
    const colWidth = this.colWidth;
    const ctx = this.$ctx;
    const transformToCanvasX = this.transformToCanvasX.bind(this);
    const transformToCanvasY = this.transformToCanvasY.bind(this);

    data.forEach(drawRect.bind(this));

    function drawRect(item, index) {
      // canvas坐标系中的比对
      let dValue = transformToCanvasY(item[0]) - transformToCanvasY(item[1]);
      let offset = -colWidth * (series.width / 2);

      let x = transformToCanvasX(xAxis.data[index], offset);
      let y = transformToCanvasY(findMax(item[0], item[1]));
      let width = colWidth * series.width;
      let height = calcAbs(dValue);

      let lineX = transformToCanvasX(xAxis.data[index]);
      let lineYStart = transformToCanvasY(item[3]);
      let lineYEnd = transformToCanvasY(item[2]);
      let lineHeight = calcAbs(lineYStart - lineYEnd);

      const duration = 1000;
      let timer = null;
      let animateHeight, animateLineHeight, animateY, animateLineY;

      growTo(height, lineHeight);

      function growTo(target1, target2) {
        const stime = Date.now();
        cancelFrame(timer);
        ani();
        function ani() {
          const offset = Math.min(duration, Date.now() - stime);
          const s = tween.ease(offset, 0, 1, duration);

          if (offset < duration) {
            ctx.save();
            ctx.lineWidth = 0.5;
            if (dValue >= 0) {
              ctx.fillStyle = color.increase;
              ctx.strokeStyle = color.increase;
            } else {
              ctx.fillStyle = color.decrease;
              ctx.strokeStyle = color.decrease;
            }

            animateHeight = s * target1;
            animateLineHeight = s * target2;
            animateY = y + (height - animateHeight) / 2;
            animateLineY = (lineHeight - animateLineHeight) / 2;

            // 矩形
            ctx.fillRect(x, animateY, width, animateHeight);
            // 线
            ctx.beginPath();
            ctx.moveTo(lineX, lineYStart + animateLineY);
            ctx.lineTo(lineX, lineYEnd - animateLineY);
            ctx.stroke();
            ctx.closePath();
            ctx.restore();

            timer = nextFrame(ani);
          }
        }
      }
    }
  };

  Candlestick.prototype.drawLine = function () {
    const self = this;
    const data = self.option.line.MA5.data;
    const dataMA5 = data.filter(function (item) {
      return item !== '-';
    });
    const begin = data.length - dataMA5.length;

    const style = self.option.line.MA5.style;
    const xAxis = self.option.xAxis;
    const ctx = self.$ctx;
    const transformToCanvasX = this.transformToCanvasX.bind(this);
    const transformToCanvasY = this.transformToCanvasY.bind(this);

    ctx.save();
    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = style.width;

    ctx.moveTo(transformToCanvasX(xAxis.data[begin]), transformToCanvasY(data[begin]));
    ctx.beginPath();

    dataMA5.forEach(function (item, index) {
      ctx.lineTo(transformToCanvasX(xAxis.data[begin + index]), transformToCanvasY(item));
    });

    ctx.stroke();
    ctx.closePath();

    ctx.strokeStyle = style.dot.borderColor;
    ctx.fillStyle = style.dot.backgroundColor;
    ctx.lineWidth = style.dot.borderWidth;

    ctx.moveTo(transformToCanvasX(xAxis.data[begin]), transformToCanvasY(data[begin]));
    dataMA5.forEach(function (item, index) {
      ctx.beginPath();
      ctx.arc(
        transformToCanvasX(xAxis.data[begin + index]),
        transformToCanvasY(item),
        style.dot.width / 2,
        0,
        2 * Math.PI,
        true
      );
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    });

    ctx.restore();
  };

  Candlestick.prototype.setIndicator = function () {
    const self = this;
    const el = self.$el;
    let canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = this.width;
    const height = this.height;
    canvas.innerText = '当前浏览器不支持canvas';
    canvas = createHiDPICanvas(canvas, width, height);
    canvas.style.position = 'absolute';
    canvas.style.top = '0px';
    canvas.style.left = '0px';

    const tooltip = document.createElement('div');
    const style = tooltip.style;
    const data = self.option.data;
    const optionStyle = self.option.style;
    const xAxis = self.option.xAxis;
    const axisPointer = self.option.axisPointer;
    const setting = self.option.tooltip;

    style.cssText = [
      'visibility: hidden',
      `background-color: ${setting.backgroundColor}`,
      `font: ${setting.font}`,
      'font-variant-numeric: tabular-nums',
      'white-space: nowrap',
      `border-radius: ${setting.borderRadius}px`,
      'position: absolute',
      'left: 0px',
      'top: 0px',
      `z-index: ${setting.zIndex}`,
      'opacity: 0',
      `padding: ${setting.padding}px`,
      'will-change: transform',
      'transition: opacity 0.2s cubic-bezier(0.23, 1, 0.32, 1) 0s, visibility 0.2s cubic-bezier(0.23, 1, 0.32, 1) 0s, transform 0.4s cubic-bezier(0.23, 1, 0.32, 1) 0s',
      `box-shadow: ${setting.boxShadow}`
    ].join(';');

    el.addEventListener('mouseover', start);
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
      let left = mouseX - el.offsetLeft;
      let top = mouseY - el.offsetTop;

      ctx.clearRect(0, 0, self.width, self.height);

      // 判断鼠标位置是否在k线图坐标系内
      if (
        left > self.seriesLeft &&
        left < self.width - optionStyle.padding &&
        top > optionStyle.padding &&
        top < self.height - self.seriesBottom
      ) {
        let currentInedx = calcFloor((left - self.seriesLeft) / self.colWidth);
        let xAxisValue = xAxis.data[currentInedx];
        let currentData = data[currentInedx];

        ctx.strokeStyle = axisPointer.borderColor;
        ctx.setLineDash(axisPointer.lineDash);
        // 横线
        ctx.beginPath();
        ctx.moveTo(self.seriesLeft, top);
        ctx.lineTo(self.width - optionStyle.padding, top);
        ctx.stroke();
        ctx.closePath();
        // 竖线
        ctx.beginPath();
        ctx.moveTo(left, optionStyle.padding);
        ctx.lineTo(left, self.height - self.seriesBottom);
        ctx.stroke();
        ctx.closePath();

        // x轴标签
        ctx.font = `${axisPointer.fontWeight} ${axisPointer.fontSize}px ${axisPointer.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = axisPointer.backgroundColor;

        let xLabelWidth = ctx.measureText(xAxisValue).width + axisPointer.padding * 2;
        let xBacPosX = left - xLabelWidth / 2;
        if (xBacPosX < self.seriesLeft) {
          xBacPosX = self.seriesLeft;
        }
        if (xBacPosX > self.width - optionStyle.padding - xLabelWidth) {
          xBacPosX = self.width - optionStyle.padding - xLabelWidth;
        }
        let yBacPosX = self.height - self.seriesBottom + axisPointer.xMarginTop;
        let xBacWidth = xLabelWidth;
        let xBacHeight = axisPointer.fontSize * axisPointer.lineHeight + axisPointer.padding * 2;

        ctx.fillRect(xBacPosX, yBacPosX, xBacWidth, xBacHeight);

        ctx.fillStyle = axisPointer.color;
        ctx.fillText(
          xAxisValue,
          xBacPosX + axisPointer.padding,
          yBacPosX + axisPointer.padding + (axisPointer.fontSize * axisPointer.lineHeight) / 2
        );

        // y轴标签
        let yAxisValue = (
          ((self.height - top - self.seriesBottom) / (self.height - self.seriesBottom - optionStyle.padding)) *
            self.relativeHeight +
          self.minValue
        ).toFixed(2);

        let yLabelWidth = ctx.measureText(yAxisValue).width + axisPointer.padding * 2;
        let xBacPosY = self.seriesLeft - yLabelWidth - axisPointer.yMarginRight;
        let yBacPosY = top - axisPointer.fontSize * axisPointer.lineHeight + axisPointer.padding;
        let yBacWidth = yLabelWidth;
        let yBacHeight = axisPointer.fontSize * axisPointer.lineHeight + axisPointer.padding * 2;

        ctx.fillStyle = axisPointer.backgroundColor;
        ctx.fillRect(xBacPosY, yBacPosY, yBacWidth, yBacHeight);

        ctx.fillStyle = axisPointer.color;
        ctx.fillText(
          yAxisValue,
          xBacPosY + axisPointer.padding,
          yBacPosY + axisPointer.padding + (axisPointer.fontSize * axisPointer.lineHeight) / 2
        );

        let titleStyle = `color: ${setting.title.color}; margin-bottom: ${setting.title.marginBottom}px; font-size: ${setting.title.fontSize}px`;
        let itemStyle = `color: ${setting.item.color}; margin-bottom: ${setting.item.marginBottom}px`;
        let lastItemStyle = `color: ${setting.item.color}`;
        let valueStyle = `font-weight: ${setting.value.fontWeight}; margin-left: ${setting.value.marginLeft}px; float: right; color: ${setting.value.color}; font-family: ${setting.value.fontFamily}`;

        let MA5 = self.option.line.MA5.data[currentInedx];

        let MA5String;
        if (MA5 !== '-') {
          MA5String = `
        <div style="${lastItemStyle}">MA5: <span style="${valueStyle}">${MA5.toFixed(2)}</span></div>
        `;
        }
        // 设置tooltip中的内容
        tooltip.innerHTML = `
        <div style="${titleStyle}">${xAxisValue}</div>
        <div style="${itemStyle}">${setting.title.data[0]}: <span style="${valueStyle}">${currentData[0].toFixed(
          2
        )}</span></div>
        <div style="${itemStyle}">${setting.title.data[1]}: <span style="${valueStyle}">${currentData[1].toFixed(
          2
        )}</span></div>
        <div style="${itemStyle}">${setting.title.data[2]}: <span style="${valueStyle}">${currentData[2].toFixed(
          2
        )}</span></div>
        <div style="${MA5 === '-' ? lastItemStyle : itemStyle}">${
          setting.title.data[3]
        }: <span style="${valueStyle}">${currentData[3].toFixed(2)}</span></div>
        ${MA5 === '-' ? '' : MA5String}
        `;

        style.transform = `translate3D(${
          left + tooltip.clientWidth > self.width - optionStyle.padding
            ? left - tooltip.clientWidth - setting.offset
            : left + setting.offset
        }px, ${
          top - optionStyle.padding < tooltip.clientHeight
            ? top + setting.offset
            : top - tooltip.clientHeight - setting.offset
        }px, 0px)`;
        style.opacity = '1';
        style.visibility = 'visible';
      } else {
        style.opacity = '0';
        style.visibility = 'hidden';
        ctx.clearRect(0, 0, self.width, self.height);
      }
    }

    function end(e) {
      style.opacity = '0';
      style.visibility = 'hidden';
      ctx.clearRect(0, 0, self.width, self.height);
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseout', end);
    }

    el.appendChild(canvas);
    el.appendChild(tooltip);
  };

  Candlestick.prototype.transformToCanvasX = function (x, offset = 0) {
    const self = this;
    const seriesLeft = self.seriesLeft; // 需要
    const colWidth = self.colWidth; //需要
    const xAxisData = self.option.xAxis.data;

    let result;
    if (xAxisData.indexOf(x) >= 0) {
      result = seriesLeft + xAxisData.indexOf(x) * colWidth + colWidth / 2 + offset;
    }

    if (result) {
      return result;
    } else {
      console.log('数据格式错误');
    }
  };

  Candlestick.prototype.transformToCanvasY = function (y) {
    const self = this;
    const height = self.height;
    const seriesBottom = self.seriesBottom;
    const seriesTop = self.option.style.padding;
    const seriesHeight = height - seriesTop - seriesBottom;
    const minValue = self.minValue;
    const relativeHeight = self.relativeHeight;

    let result;
    result = seriesHeight - ((y - minValue) / relativeHeight) * seriesHeight + seriesTop;

    if (result) {
      return result;
    } else {
      console.log('数据格式错误');
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

  function getWidth(el) {
    return el.clientWidth;
  }

  function getHeight(el) {
    return el.clientHeight;
  }

  function isPlainObject(val) {
    return toString.call(val) === '[object Object]';
  }

  function calculateMA(data, dayCount) {
    var result = [];
    for (var i = 0, len = data.length; i < len; i++) {
      if (i < dayCount) {
        result.push('-');
        continue;
      }
      var sum = 0;
      for (var j = 0; j < dayCount; j++) {
        sum += data[i - j][1];
      }
      result.push(sum / dayCount);
    }
    return result;
  }

  window.candlestick = candlestick;
})(window, document);
