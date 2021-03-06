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
  let colorIndex = 0;

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
        padding: 24,
        backgroundColor: '#fff',
        fontFamily: 'sans-serif',
        fontWeight: 400,
        fontSize: 12,
        lineHeight: 1,
        colors: ['#708cde', '#91cc75', '#fac858', '#ee6666']
      },
      animateTime: 1000,
      data: [],
      line: {
        data: {},
        style: {
          width: 2,
          opacity: 0.5,
          dot: {
            backgroundColor: '#fff',
            width: 3,
            borderWidth: 2
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
        width: 0.75
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
          data: ['?????????', '?????????', '?????????', '?????????']
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
    canvas.innerText = '????????????????????????canvas';
    canvas = createHiDPICanvas(canvas, this.width, this.height);
    this.$canvas = canvas;
    this.$ctx = canvas.getContext('2d');
    this.$el.appendChild(canvas);
  };

  Candlestick.prototype.setOption = function (option) {
    this.splitData(option);
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

    // ??????option
    this.option = deepMerge(this.option, option);
    this.option.xAxis.data = xAxisData;
    this.option.data = values;
    this.len = this.option.data.length;
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

    // ????????????????????????????????????
    this.maxValue = maxValue;
    this.minValue = minValue;
    this.relativeHeight = maxValue - minValue;

    ctx.font = `${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;

    // ????????????????????????
    this.labelWidth = ctx.measureText(`${maxValue.toFixed(2)}`).width;
    this.labelHeight = style.fontSize * style.lineHeight;

    // ???????????????????????????????????????
    this.seriesLeft = style.padding + this.labelWidth + yAxis.paddingRight;
    this.seriesBottom = style.padding + this.labelHeight + xAxis.paddingTop;
    this.seriesTop = style.padding;
    this.seriesRight = style.padding;
    this.seriesWidth = this.width - this.seriesLeft - style.padding;
    this.seriesHeight = this.height - this.seriesBottom - style.padding;

    // ????????????????????????
    this.rowHeight = (this.height - this.labelHeight - xAxis.paddingTop - style.padding * 2) / yAxis.interval;
    this.colWidth = (this.width - this.seriesLeft - style.padding) / this.len;
  };

  Candlestick.prototype.draw = function () {
    const ctx = this.$ctx;
    const style = this.option.style;

    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawYAxisLabel();
    this.drawXAxisLabel();
    this.clearSeries();
    this.drawSplitLine();
    this.drawCandle();
    this.drawMALine(5);
    this.drawMALine(10);
    this.drawMALine(20);
    this.drawMALine(30);
    this.setIndicator();
  };

  // y?????????
  Candlestick.prototype.drawYAxisLabel = function () {
    const yAxis = this.option.yAxis;
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

    for (let i = 1; i <= yAxis.interval; i++) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = yAxis.color;
      ctx.fillText(
        `${labelArray[i]}`,
        this.seriesLeft - yAxis.paddingRight,
        el.clientHeight - this.seriesBottom - i * this.rowHeight
      );
    }
    //???????????????
    ctx.fillText(`${labelArray[0]}`, this.seriesLeft - yAxis.paddingRight, el.clientHeight - this.seriesBottom);
  };

  // x?????????
  Candlestick.prototype.drawXAxisLabel = function () {
    const self = this;
    const ctx = self.$ctx;
    const xAxis = self.option.xAxis;

    ctx.save();

    ctx.textAlign = 'left';
    ctx.fillText(
      `${xAxis.data[0]}`,
      self.seriesLeft,
      self.height - self.seriesBottom + self.labelHeight + xAxis.paddingTop
    );

    ctx.fillText(
      `${self.option.xAxis.data[self.len - 1]}`,
      self.width - ctx.measureText(xAxis.data[self.len - 1]).width - self.seriesRight,
      self.height - self.seriesBottom + self.labelHeight + xAxis.paddingTop
    );

    ctx.restore();
  };

  Candlestick.prototype.clearSeries = function () {
    const self = this;
    const ctx = self.$ctx;
    const duration = self.option.animateTime >= 16 ? self.option.animateTime : 16;
    let timer = null;

    clear();

    function clear() {
      const stime = Date.now();
      cancelFrame(timer);
      animate();
      function animate() {
        const offset = findMin(duration, Date.now() - stime);
        if (offset < duration) {
          ctx.save();
          ctx.clearRect(self.seriesLeft, self.seriesTop, self.seriesWidth, self.seriesHeight);
          ctx.restore();
          timer = nextFrame(animate);
        }
      }
    }
  };

  Candlestick.prototype.drawSplitLine = function () {
    const self = this;
    const ctx = self.$ctx;
    const style = self.option.style;
    const xAxis = self.option.xAxis;
    const yAxis = self.option.yAxis;
    const duration = self.option.animateTime >= 16 ? self.option.animateTime : 16;
    let timer = null;

    splitLine();

    function splitLine() {
      const stime = Date.now();
      cancelFrame(timer);
      animate();
      function animate() {
        const offset = findMin(duration, Date.now() - stime);

        if (offset < duration) {
          // y????????????
          for (let i = 1; i <= yAxis.interval; i++) {
            ctx.save();
            ctx.translate(0, self.height);
            ctx.scale(1, -1);
            ctx.strokeStyle = yAxis.borderColor;

            ctx.beginPath();
            ctx.moveTo(self.seriesLeft, i * self.rowHeight + self.seriesBottom);
            ctx.lineTo(self.width - style.padding, i * self.rowHeight + self.seriesBottom);
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
          }

          // x???
          ctx.save();
          ctx.strokeStyle = xAxis.borderColor;
          ctx.translate(0, self.height);
          ctx.scale(1, -1);

          ctx.beginPath();
          ctx.moveTo(self.seriesLeft, self.seriesBottom);
          ctx.lineTo(self.width - style.padding, self.seriesBottom);
          ctx.stroke();
          ctx.closePath();
          ctx.restore();

          timer = nextFrame(animate);
        }
      }
    }
  };

  Candlestick.prototype.drawCandle = function () {
    const data = this.option.data;
    const duration = this.option.animateTime >= 16 ? this.option.animateTime : 16;
    const series = this.option.series;
    const color = this.option.color;
    const xAxis = this.option.xAxis;
    const colWidth = this.colWidth;
    const ctx = this.$ctx;
    const transformToCanvasX = this.transformToCanvasX.bind(this);
    const transformToCanvasY = this.transformToCanvasY.bind(this);

    data.forEach(drawRect.bind(this));

    function drawRect(item, index) {
      // canvas?????????????????????
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

      let timer = null;
      let animateHeight, animateLineHeight, animateY, animateLineY;

      scaleTo(height, lineHeight);

      function scaleTo(target1, target2) {
        const stime = Date.now();
        cancelFrame(timer);
        animate();
        function animate() {
          const offset = findMin(duration, Date.now() - stime);
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

            // ??????
            ctx.fillRect(x, animateY, width, animateHeight);
            // ???
            ctx.beginPath();
            ctx.moveTo(lineX, lineYStart + animateLineY);
            ctx.lineTo(lineX, lineYEnd - animateLineY);
            ctx.stroke();
            ctx.closePath();
            ctx.restore();

            timer = nextFrame(animate);
          }
        }
      }
    }
  };

  Candlestick.prototype.drawMALine = function (day) {
    const self = this;
    const duration = self.option.animateTime >= 16 ? self.option.animateTime : 16;
    const seriesLeft = self.seriesLeft;
    const seriesTop = self.seriesTop;
    const seriesHeight = self.seriesHeight;
    const colWidth = self.colWidth;
    const data = calculateMA(self.option.data, day);
    self.option.line.data[`MA${day}`] = data;
    const dataMA = data.filter(function (item) {
      return item !== '-';
    });
    const begin = data.length - dataMA.length;

    const colors = self.option.style.colors;
    const index = colorIndex++ % colors.length;
    const style = self.option.line.style;
    const xAxis = self.option.xAxis;
    const ctx = self.$ctx;
    const transformToCanvasX = self.transformToCanvasX.bind(self);
    const transformToCanvasY = self.transformToCanvasY.bind(self);

    const points = [];

    dataMA.forEach(function (item, index) {
      const x = transformToCanvasX(xAxis.data[begin + index]);
      const y = transformToCanvasY(item);
      points.push({
        x: x,
        y: y
      });
    });

    const bezierPoints = [];
    const ratio = 0.4;

    points.forEach(function (item, i) {
      // ??????(???????????????????????????????????????????????????)?????????
      if (i > 0 && i < points.length - 1) {
        const prevPoint = points[i - 1];
        const nextPoint = points[i + 1];
        const ctrlPoints = calcCtrlPoint(prevPoint, item, nextPoint, ratio);
        bezierPoints.push(ctrlPoints.prev, item, ctrlPoints.next);
      } else {
        return;
      }
    });

    if (points.length > 2) {
      const firstPoint = points[0];
      const secondPoint = points[1];
      const beforePoint = {
        x: firstPoint.x - colWidth,
        y: (firstPoint.y + secondPoint.y) / 2
      };

      const lastPoint = points[points.length - 1];
      const secondTolastPoint = points[points.length - 2];
      const afterPoint = {
        x: lastPoint.x + colWidth,
        y: (lastPoint.y + secondTolastPoint.y) / 2
      };

      let firstCtrlPoint, lastCtrlPoint;
      firstCtrlPoint = calcCtrlPoint(beforePoint, firstPoint, secondPoint, ratio / 4).next;
      lastCtrlPoint = calcCtrlPoint(secondTolastPoint, lastPoint, afterPoint, ratio / 4).prev;

      bezierPoints.unshift(firstCtrlPoint);
      bezierPoints.push(lastCtrlPoint, lastPoint);
    }

    // ??????MA?????????x???????????????
    const distance = calcAbs(points[0].x - points[points.length - 1].x);
    const circleWidth = style.dot.width;
    const color = colors[index];
    let timer1 = null;
    let timer2 = null;
    let animateWidth;

    lineTo(distance);
    circleTo(circleWidth);

    // ??????
    function lineTo(distance) {
      const stime = Date.now();
      cancelFrame(timer1);
      animate();
      function animate() {
        const offset = findMin(duration, Date.now() - stime);
        const s = tween['ease-in-out'](offset, 0, 1, duration);
        let animateMA = [...bezierPoints];

        if (offset < duration) {
          animateWidth = s * distance + colWidth * begin + colWidth / 2;

          ctx.save();
          ctx.rect(seriesLeft, seriesTop, animateWidth, seriesHeight);
          ctx.clip();
          ctx.strokeStyle = color;
          ctx.lineWidth = style.width;
          ctx.globalAlpha = style.opacity;

          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          if (points.length > 2) {
            for (let i = 0; i < animateMA.length / 3; i++) {
              ctx.bezierCurveTo(
                animateMA[3 * i].x,
                animateMA[3 * i].y,
                animateMA[3 * i + 1].x,
                animateMA[3 * i + 1].y,
                animateMA[3 * i + 2].x,
                animateMA[3 * i + 2].y
              );
            }
          } else if ((points.length = 2)) {
            ctx.lineTo(points[1].x, points[1].y);
          } else {
            console.log('???????????????2');
          }

          ctx.stroke();
          ctx.closePath();
          ctx.restore();

          timer1 = nextFrame(animate);
        }
      }
    }

    // ??????
    function circleTo(circleWidth) {
      const stime = Date.now();
      cancelFrame(timer2);
      animate();
      function animate() {
        const offset = findMin(duration, Date.now() - stime);
        const s = tween['ease-in-out'](offset, 0, 1, duration);

        if (offset < duration) {
          animateWidth = s * distance + colWidth * begin + colWidth / 2;

          ctx.save();
          ctx.strokeStyle = color;
          ctx.fillStyle = style.dot.backgroundColor;
          ctx.lineWidth = style.dot.borderWidth;

          // ???????????????
          dataMA.forEach(function (item, index) {
            ctx.beginPath();
            ctx.arc(
              transformToCanvasX(xAxis.data[begin + index]),
              transformToCanvasY(item),
              (circleWidth * s) / 2,
              0,
              2 * Math.PI,
              true
            );
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
          });
          ctx.restore();

          timer2 = nextFrame(animate);
        }
      }
    }
  };

  Candlestick.prototype.setIndicator = function () {
    const self = this;
    const el = self.$el;
    let canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = this.width;
    const height = this.height;
    canvas.innerText = '????????????????????????canvas';
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
    const lineDatas = self.option.line.data;

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
      `padding-bottom: ${setting.padding - setting.item.marginBottom}px`,
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

      // ???????????????????????????k??????????????????
      if (
        left > self.seriesLeft &&
        left < self.width - optionStyle.padding &&
        top > optionStyle.padding &&
        top < self.height - self.seriesBottom
      ) {
        let currentInedx = calcFloor((left - self.seriesLeft) / self.colWidth);
        let xAxisValue = xAxis.data[currentInedx];
        let currentData = data[currentInedx];
        const color = self.option.color;
        let currentColor = currentData[1] - currentData[0] > 0 ? color.increase : color.decrease;

        ctx.strokeStyle = axisPointer.borderColor;
        ctx.setLineDash(axisPointer.lineDash);
        // ??????
        ctx.beginPath();
        ctx.moveTo(self.seriesLeft, top);
        ctx.lineTo(self.width - optionStyle.padding, top);
        ctx.stroke();
        ctx.closePath();
        // ??????
        ctx.beginPath();
        ctx.moveTo(left, optionStyle.padding);
        ctx.lineTo(left, self.height - self.seriesBottom);
        ctx.stroke();
        ctx.closePath();

        // x?????????
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

        // y?????????
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
        let itemStyle = `display: flex; align-items: center; justify-content: space-between; color: ${setting.item.color}; margin-bottom: ${setting.item.marginBottom}px`;
        let valueStyle = `font-weight: ${setting.value.fontWeight}; margin-left: ${setting.value.marginLeft}px; float: right; color: ${setting.value.color}; font-family: ${setting.value.fontFamily}`;
        let trendStyle = `display: inline-block; width: 4px; height: 4px; background: ${currentColor}; border-radius: 50%`;

        // ??????tooltip????????????
        let content = `<div style="${titleStyle}">${xAxisValue}</div>`;

        for (let i = 0; i < setting.title.data.length; i++) {
          content += `<div style="${itemStyle}"><span style="display: flex; align-items: center"><span style="display: flex; align-items: center; justify-content: center; width: 8px; height: 8px; margin-right: 6px"><span style="${trendStyle}"></span></span>${
            setting.title.data[i]
          } </span><span style="${valueStyle}">${currentData[i].toFixed(2)}</span></div>`;
        }

        const colors = optionStyle.colors;
        let colorIndex = 0;

        for (key in lineDatas) {
          let circleStyle = `display: inline-block; width: 8px; height: 8px; background: ${
            colors[colorIndex++]
          }; margin-right: 6px; border-radius: 50%`;

          const data = lineDatas[key];

          if (data[currentInedx] !== '-') {
            content += `
            <div style="${itemStyle}"><span><span style="${circleStyle}"></span>${key} </span><span style="${valueStyle}">${data[
              currentInedx
            ].toFixed(2)}</span></div>
            `;
          }
        }

        tooltip.innerHTML = content;

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
    const seriesLeft = self.seriesLeft; // ??????
    const colWidth = self.colWidth; //??????
    const xAxisData = self.option.xAxis.data;

    let result;
    if (xAxisData.indexOf(x) >= 0) {
      result = seriesLeft + xAxisData.indexOf(x) * colWidth + colWidth / 2 + offset;
    }

    if (result) {
      return result;
    } else {
      console.log('??????????????????');
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
      console.log('??????????????????');
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

  function calcDistance(v1, v2) {
    return Math.sqrt((v1.x - v2.x) * (v1.x - v2.x) + (v1.y - v2.y) * (v1.y - v2.y));
  }
  function calcCtrlPoint(before, current, after, ratio) {
    const disX = after.x - before.x;
    const disY = after.y - before.y;
    let scale = calcAbs(after.y - current.y) / calcAbs(before.y - current.y);
    const distance = calcDistance(before, after);
    const ctrlDistance = distance * ratio;
    const prevDis = ctrlDistance / (1 + scale);
    const nextDis = (ctrlDistance * scale) / (1 + scale);
    let prevCtrlPoint = {};
    let nextCtrlPoint = {};

    prevCtrlPoint.x = current.x - (disX * prevDis) / distance;
    prevCtrlPoint.y = current.y - (disY * prevDis) / distance;

    nextCtrlPoint.x = current.x + (disX * nextDis) / distance;
    nextCtrlPoint.y = current.y + (disY * nextDis) / distance;

    return { prev: prevCtrlPoint, next: nextCtrlPoint };
  }

  window.candlestick = candlestick;
})(window, document);
