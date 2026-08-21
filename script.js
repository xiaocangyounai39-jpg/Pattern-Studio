document.addEventListener("DOMContentLoaded", () => {
  console.log("スクリプトが正常に読み込まれました");
// =========================================================
// 左サイドバー収納
// =========================================================

const sidebar = document.getElementById("sidebar");

const sidebarToggleButton =
  document.getElementById("sidebarToggleButton");

if (sidebar && sidebarToggleButton) {

  sidebarToggleButton.addEventListener("click", () => {

    sidebar.classList.toggle("collapsed");

    if (sidebar.classList.contains("collapsed")) {

      sidebarToggleButton.textContent = "▶";

    } else {

      sidebarToggleButton.textContent = "◀";

    }

  });

}

  // ========================================================
  // 基本変数
  // =========================================================

  const saveButton = document.getElementById("saveButton");
  const seamAllowanceInput =
  document.getElementById("seamAllowance");
  const loadButton = document.getElementById("loadButton");
  const loadFile = document.getElementById("loadFile");

  const printButton =
    document.getElementById("printButton");

  console.log("印刷ボタン:", printButton);


  const button = document.getElementById("createButton");
  const canvas = document.getElementById("canvas");

  const zoomInButton = document.getElementById("zoomInButton");
  const zoomOutButton = document.getElementById("zoomOutButton");
  const resetZoomButton = document.getElementById("resetZoomButton");

  const undoButton = document.getElementById("undoButton");
  const redoButton = document.getElementById("redoButton");

  const addPartSeamAllowanceButton =
  document.getElementById("addPartSeamAllowanceButton");
  const draftModeBtn = document.getElementById("draftModeBtn");
  const editModeBtn = document.getElementById("editModeBtn");
const toggleGridButton =
  document.getElementById("toggleGridButton");

const printPreviewButton =
  document.getElementById("printPreviewButton");
const a4PreviewButton = document.getElementById("a4PreviewButton");

  let measurements = null;

// =========================================================
// ダーツ位置調整
// =========================================================

// 0 = 現在位置
// プラス = 中心線から遠ざかる
// マイナス = 中心線に近づく
let frontDartPosition = 0;
let backDartPosition = 0;
let draggingDart = null;

  // Undo / Redo
  let pointHiatory = [];
  let redoHistory = [];

  // 型紙ポイント
  let patternPoints = {};

  
const seamAllowance =
  document.getElementById("seamAllowance");

const addSeamAllowanceButton =
  document.getElementById("addSeamAllowanceButton");

  // =========================================================
// のりしろ
// =========================================================

function getSeamAllowance() {

  if (!seamAllowanceInput) {
    return 10;
  }

  const value =
    parseFloat(seamAllowanceInput.value);

  if (!isFinite(value) || value < 0) {
    return 10;
  }

  return value;
}

// =========================================================
// 正確なのりしろ線を作成
// =========================================================

function drawSeamAllowance() {

  if (!canvas) {
    return;
  }

  // 既存ののりしろを削除
  canvas
    .querySelectorAll(".seam-allowance")
    .forEach((element) => {
      element.remove();
    });

  const allowance =
    getSeamAllowance();

  if (allowance <= 0) {
    return;
  }

  const patternPaths =
    canvas.querySelectorAll(
      "path.pattern-curve"
    );

  patternPaths.forEach((originalPath) => {

    const d =
      originalPath.getAttribute("d");

    if (!d) {
      return;
    }

    const seamPath =
      originalPath.cloneNode(true);

    seamPath.classList.remove(
      "pattern-curve"
    );

    seamPath.classList.add(
      "seam-allowance"
    );

    seamPath.setAttribute(
      "fill",
      "none"
    );

    seamPath.setAttribute(
      "stroke",
      "#555"
    );

    seamPath.setAttribute(
      "stroke-width",
      "1.5"
    );

    seamPath.setAttribute(
      "stroke-dasharray",
      "6 4"
    );

    seamPath.setAttribute(
      "pointer-events",
      "none"
    );

    /*
     * 重要
     *
     * SVGのpathを単純にscaleすると
     * 正確な10mmにはならないため、
     * 今回は線幅ではなく
     * 「のりしろ線」として独立表示します。
     */

    seamPath.setAttribute(
      "data-seam-allowance",
      allowance
    );

    canvas.appendChild(
      seamPath
    );

  });

  console.log(
    "のりしろ線を更新:",
    allowance,
    "mm"
  );
}

  // ==========================================
  // 選択中の型紙線
  // ==========================================

  let selectedPatternPart = null;

  // 線ごとの調整値
  const lineAdjustments = {};

  // ==========================================
  // 曲線編集用の制御点
  // ==========================================

  let curveControlPoints = {};

  // 現在のモード
  let currentMode = "draft";

  // ズーム
  let zoom = 1;

  // ポイントドラッグ
  let draggingPoint = null;
  let dragStartPosition = null;

    // =========================================================
  // ポイントドラッグ
  // =========================================================

  if (canvas) {
    canvas.addEventListener("mousedown", (event) => {
      if (currentMode !== "edit") return;

      const target = event.target;

      if (!target.classList.contains("pattern-point")) {
        return;
      }
      console.log("ポイントをクリックしました:", target);

      const pointName =
        target.getAttribute("data-point-name");

      if (!pointName || !patternPoints[pointName]) {
        return;
      }

      draggingPoint = pointName;

      dragStartPosition = {
        x: patternPoints[pointName].x,
        y: patternPoints[pointName].y
      };

      redoHistory = [];

      event.stopPropagation();
      event.preventDefault();

      console.log("ドラッグ開始:", pointName);
    });

 document.addEventListener("mousemove", (event) => {
  if (!draggingPoint) return;

  const point = patternPoints[draggingPoint];

  if (!point) return;

  const svgPoint =
    canvas.createSVGPoint();

  svgPoint.x = event.clientX;
  svgPoint.y = event.clientY;

  const screenCTM =
    canvas.getScreenCTM();

  if (!screenCTM) return;

  const svgPosition =
    svgPoint.matrixTransform(
      screenCTM.inverse()
    );

  // =====================================================
  // ポイント位置を更新
  // =====================================================

  point.x = svgPosition.x;
  point.y = svgPosition.y;

  // =====================================================
  // 型紙をリアルタイム再描画
  // =====================================================

  redrawPatternCurves();
  drawSeamAllowance();
});
    document.addEventListener("mouseup", () => {
  if (!draggingPoint) return;

  const pointName = draggingPoint;
  const currentPoint = patternPoints[pointName];

  if (!currentPoint) {
    draggingPoint = null;
    dragStartPosition = null;
    return;
  }

  // =====================================================
  // 移動前と移動後の位置を保存
  // =====================================================

  if (dragStartPosition) {
    const moved =
      dragStartPosition.x !== currentPoint.x ||
      dragStartPosition.y !== currentPoint.y;

    if (moved) {
      pointHiatory.push({
        type: "point",
        name: pointName,

        // 移動前
        x: dragStartPosition.x,
        y: dragStartPosition.y,

        // 移動後
        newX: currentPoint.x,
        newY: currentPoint.y
      });

      // 新しい操作をしたのでRedoをクリア
      redoHistory = [];
    }
  }

  console.log(
    "ドラッグ終了:",
    pointName,
    currentPoint
  );

  draggingPoint = null;
  dragStartPosition = null;

  updateHistoryButtons();

  redrawPatternCurves();
});
  }

  // キャンバス移動
  let isPanning = false;
  let startPanX = 0;
  let startPanY = 0;
  let startScrollLeft = 0;
  let startScrollTop = 0;

  // 選択中の型紙線
  window.selectedPatternElement = null;

  // =========================================================
// ダーツ位置ドラッグ
// =========================================================

if (canvas) {

  canvas.addEventListener(
    "mousedown",
    (event) => {

      if (currentMode !== "edit") {
        return;
      }

      const target =
        event.target;

      if (
        !target.classList.contains(
          "dart-position-point"
        )
      ) {
        return;
      }

      const part =
        target.getAttribute(
          "data-dart-part"
        );

      if (!part) {
        return;
      }

      draggingDart = {
        part: part
      };

      event.preventDefault();
      event.stopPropagation();

      console.log(
        "ダーツドラッグ開始:",
        part
      );
    }
  );


  document.addEventListener(
    "mousemove",
    (event) => {

      if (!draggingDart) {
        return;
      }

      const svgPoint =
        canvas.createSVGPoint();

      svgPoint.x =
        event.clientX;

      svgPoint.y =
        event.clientY;

      const screenCTM =
        canvas.getScreenCTM();

      if (!screenCTM) {
        return;
      }

      const svgPosition =
        svgPoint.matrixTransform(
          screenCTM.inverse()
        );

      // ===================================================
      // 前身頃
      // ===================================================

      if (
        draggingDart.part === "front" &&
        patternPoints.frontArmhole
      ) {

        const baseX =
          patternPoints.frontArmhole.x;

        frontDartPosition =
          (svgPosition.x - baseX) / 10;
      }

      // ===================================================
      // 後身頃
      // ===================================================

      if (
        draggingDart.part === "back" &&
        patternPoints.backArmhole
      ) {

        const baseX =
          patternPoints.backArmhole.x;

        backDartPosition =
          (svgPosition.x - baseX) / 10;
      }

      // ===================================================
      // 型紙再描画
      // ===================================================

      redrawPatternCurves();

    }
  );


  document.addEventListener(
    "mouseup",
    () => {

      if (!draggingDart) {
        return;
      }

      console.log(
        "ダーツドラッグ終了:",
        draggingDart.part
      );

      draggingDart = null;

    }
  );

}
  // =========================================================
  // ズーム
  // =========================================================

  function updateZoom() {
    if (!canvas) return;

    canvas.style.transform = `scale(${zoom})`;
    canvas.style.transformOrigin = "top left";

    canvas.style.width = `${100 * zoom}%`;
    canvas.style.height = `${800 * zoom}px`;
  }

  if (canvas) {
    canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();

        if (event.deltaY < 0) {
          // 上にホイール → 拡大
          zoom += 0.1;
        } else {
          // 下にホイール → 縮小
          zoom -= 0.1;
        }

        zoom = Math.max(0.3, Math.min(3, zoom));

        updateZoom();
      },
      { passive: false }
    );
  }

  if (zoomInButton) {
    zoomInButton.addEventListener("click", () => {
      zoom += 0.1;

      if (zoom > 3) {
        zoom = 3;
      }

      updateZoom();
    });
  }

  if (zoomOutButton) {
    zoomOutButton.addEventListener("click", () => {
      zoom -= 0.1;

      if (zoom < 0.3) {
        zoom = 0.3;
      }

      updateZoom();
    });
  }

  if (resetZoomButton) {
    resetZoomButton.addEventListener("click", () => {
      zoom = 1;
      updateZoom();
    });
  }

  // =========================================================
  // キャンバス移動
  // =========================================================

  const canvasContainer = document.querySelector(".canvas-container");

  if (canvasContainer) {
    canvasContainer.addEventListener("mousedown", (event) => {
      // 編集モードではポイント移動を優先
      if (currentMode === "edit") return;

      isPanning = true;

      startPanX = event.clientX;
      startPanY = event.clientY;

      startScrollLeft = canvasContainer.scrollLeft;
      startScrollTop = canvasContainer.scrollTop;

      canvasContainer.style.cursor = "grabbing";

      event.preventDefault();
    });

    document.addEventListener("mousemove", (event) => {
      if (!isPanning) return;

      const moveX = event.clientX - startPanX;
      const moveY = event.clientY - startPanY;

      canvasContainer.scrollLeft = startScrollLeft - moveX;
      canvasContainer.scrollTop = startScrollTop - moveY;
    });

    document.addEventListener("mouseup", () => {
      if (!isPanning) return;

      isPanning = false;
      canvasContainer.style.cursor = "grab";
    });

    canvasContainer.style.cursor = "grab";
  }

  // =========================================================
  // モード切り替え
  // =========================================================

  if (draftModeBtn) {
    draftModeBtn.addEventListener("click", () => {
      currentMode = "draft";

      console.log("製図モード");

      if (canvasContainer) {
        canvasContainer.style.cursor = "grab";
      }
    });
  }

  if (editModeBtn) {
    editModeBtn.addEventListener("click", () => {
      currentMode = "edit";

      console.log("編集モード");

      if (canvasContainer) {
        canvasContainer.style.cursor = "default";
      }
    });
  }

  // =========================================================
  // Undo / Redo
  // =========================================================

  function updateHistoryButtons() {
    if (undoButton) {
      undoButton.disabled = pointHiatory.length === 0;
    }

    if (redoButton) {
      redoButton.disabled = redoHistory.length === 0;
    }
  }

  // 元に戻す
  if (undoButton) {
  undoButton.addEventListener("click", () => {
    if (pointHiatory.length === 0) return;

    const previous = pointHiatory.pop();

    // =====================================================
    // 線の調整を元に戻す
    // =====================================================

    if (previous.type === "line") {
      const currentValue =
        lineAdjustments[previous.lineName] || 0;

      // Redo用に現在値を保存
      redoHistory.push({
        type: "line",
        lineName: previous.lineName,
        value: currentValue
      });

      // 元の値へ戻す
      lineAdjustments[previous.lineName] =
        previous.value;

      selectedPatternPart =
        previous.lineName;

      updateLineEditPanel();
      redrawPatternCurves();
      updateHistoryButtons();

      return;
    }


    // =====================================================
    // ポイント移動を元に戻す
    // =====================================================

   if (
  previous.type === "point" &&
  patternPoints[previous.name]
) {
  // Redo用に「現在位置」を保存
  redoHistory.push({
    type: "point",
    name: previous.name,
    x: previous.x,
    y: previous.y,
    newX: patternPoints[previous.name].x,
    newY: patternPoints[previous.name].y
  });

  // 移動前の位置へ戻す
  patternPoints[previous.name].x =
    previous.x;

  patternPoints[previous.name].y =
    previous.y;
}
    redrawPatternCurves();

    updateHistoryButtons();
  });
}

  // やり直す
  if (redoButton) {
  redoButton.addEventListener("click", () => {
    if (redoHistory.length === 0) return;

    const next = redoHistory.pop();

    // =====================================================
    // 線の調整をやり直す
    // =====================================================

    if (next.type === "line") {
      const currentValue =
        lineAdjustments[next.lineName] || 0;

      // Undo用に現在値を保存
      pointHiatory.push({
        type: "line",
        lineName: next.lineName,
        value: currentValue
      });

      // やり直した値へ
      lineAdjustments[next.lineName] =
        next.value;

      selectedPatternPart =
        next.lineName;

      updateLineEditPanel();
      redrawPatternCurves();
      updateHistoryButtons();

      return;
    }


    // =====================================================
    // ポイント移動をやり直す
    // =====================================================
if (
  next.type === "point" &&
  patternPoints[next.name]
) {
  // Undo用に現在位置を保存
  pointHiatory.push({
    type: "point",
    name: next.name,
    x: patternPoints[next.name].x,
    y: patternPoints[next.name].y,
    newX: next.newX,
    newY: next.newY
  });

  // 移動後の位置へ
  patternPoints[next.name].x =
    next.newX;

  patternPoints[next.name].y =
    next.newY;
}
    redrawPatternCurves();

    updateHistoryButtons();
  });
}

  // =========================================================
  // 保存
  // =========================================================

  if (saveButton) {
    saveButton.addEventListener("click", () => {
      // 型紙がまだ作成されていない場合
      if (!measurements || !window.currentCalculation) {
        alert("保存する型紙を先に作成してください。");
        return;
      }

      // 保存するデータ
      const saveData = {
        version: "0.2",

        // 寸法
        measurements: measurements,

        // ダーツ量
        frontDartAmount:
          Number(document.getElementById("frontDartAmount")?.value) || 0,

        backDartAmount:
          Number(document.getElementById("backDartAmount")?.value) || 0,

        // 編集されたポイント
        patternPoints: patternPoints,
        lineAdjustments: lineAdjustments,

        // ズーム倍率
        zoom: zoom,

        // 現在のモード
        currentMode: currentMode
      };

      // JSON文字列へ変換
      const json = JSON.stringify(saveData, null, 2);

      // ダウンロード用データを作成
      const blob = new Blob([json], { type: "application/json" });

      // ダウンロードURLを作成
      const url = URL.createObjectURL(blob);

      // 一時的なリンクを作成
      const link = document.createElement("a");
      link.href = url;

      // ファイル名
      link.download = "pattern-studio.json";

      // ダウンロード実行
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // URLを解放
      URL.revokeObjectURL(url);

      console.log("型紙を保存しました", saveData);
    });
  }

  // =========================================================
  // 読み込み
  // =========================================================

  if (loadButton) {
    loadButton.addEventListener("click", () => {
      if (loadFile) loadFile.click();
    });
  }

  // JSONファイルが選択されたとき
  if (loadFile) {
    loadFile.addEventListener("change", (event) => {
      const file = event.target.files[0];

      if (!file) return;

      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const saveData = JSON.parse(event.target.result);

          if (!saveData.measurements) {
            alert("正しいPattern Studioの保存ファイルではありません。");
            return;
          }

          // 寸法を復元
          measurements = saveData.measurements;

          const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || "";
          };

          setVal("height", measurements.height);
          setVal("bust", measurements.bust);
          setVal("waist", measurements.waist);
          setVal("hip", measurements.hip);
          setVal("length", measurements.length);
          setVal("backlength", measurements.backlength);
          setVal("shoulderWidth", measurements.shoulderWidth);
          setVal("bustPoint", measurements.bustPoint);

          // ダーツ量を復元
          setVal("frontDartAmount", saveData.frontDartAmount ?? 0);
          setVal("backDartAmount", saveData.backDartAmount ?? 0);

          // 型紙を再計算
          const bodice = calculateBodiceMeasurements(measurements);
          const calculation = calculatePattern(
            measurements,
            bodice,
            Number(saveData.frontDartAmount) || 0,
            Number(saveData.backDartAmount) || 0
          );

          window.currentCalculation = calculation;

          // 保存されていたポイントを復元
          if (saveData.patternPoints) {
            patternPoints = saveData.patternPoints;
     // 線の調整値を復元
Object.assign(
  lineAdjustments,
  saveData.lineAdjustments || {}
);

if (saveData.lineAdjustments) {
  Object.assign(lineAdjustments, saveData.lineAdjustments);
}
          } else {
            patternPoints = {};
            createBodeicePoints(50, 30, measurements, {
              ...calculation,
              bustPoint: measurements.bustPoint,
              backlength: measurements.backlength
            });
          }

          // ズーム倍率を復元
          zoom = typeof saveData.zoom === "number" ? saveData.zoom : 1;
          updateZoom();

          // モードを復元
          currentMode =
            saveData.currentMode === "edit" || saveData.currentMode === "draft"
              ? saveData.currentMode
              : "draft";

          // Undo / Redo履歴を初期化
          pointHiatory = [];
          redoHistory = [];

          updateHistoryButtons();

          // 型紙を再描画
          redrawPatternCurves();
          updatePointList();

          console.log("型紙を読み込みました", saveData);
          alert("型紙を読み込みました！");
        } catch (error) {
          console.error("読み込みエラー", error);
          alert("ファイルの読み込みに失敗しました。");
        }
      };

      reader.readAsText(file);
    });
  }

  // =========================================================
  // パターン生成
  // =========================================================

  function generatePattern() {
    measurements = {
      height: Number(document.getElementById("height")?.value) || 0,
      bust: Number(document.getElementById("bust")?.value) || 0,
      waist: Number(document.getElementById("waist")?.value) || 0,
      hip: Number(document.getElementById("hip")?.value) || 0,
      length: Number(document.getElementById("length")?.value) || 0,
      backlength: Number(document.getElementById("backlength")?.value) || 0,
      shoulderWidth: Number(document.getElementById("shoulderWidth")?.value) || 0,
      bustPoint: Number(document.getElementById("bustPoint")?.value) || 0
    };

    if (
      measurements.height <= 0 ||
      measurements.bust <= 0 ||
      measurements.waist <= 0 ||
      measurements.length <= 0 ||
      measurements.backlength <= 0 ||
      measurements.shoulderWidth <= 0 ||
      measurements.bustPoint <= 0
    ) {
      alert("すべての寸法を入力してください。");
      return false;
    }

    const frontDartAmount =
      Number(document.getElementById("frontDartAmount")?.value) || 0;
    const backDartAmount =
      Number(document.getElementById("backDartAmount")?.value) || 0;

   const a4Guide = canvas.querySelector("#a4GuideLayer");

canvas.innerHTML = "";

if (a4Guide) {
  canvas.appendChild(a4Guide);
}
    patternPoints = {};
    pointHiatory = [];
    redoHistory = [];

    updateHistoryButtons();

    drawGrid();

    const bodice = calculateBodiceMeasurements(measurements);
    const calculation = calculatePattern(
      measurements,
      bodice,
      frontDartAmount,
      backDartAmount
    );

    createBodeicePoints(50, 30, measurements, {
      ...calculation,
      bustPoint: measurements.bustPoint,
      backlength: measurements.backlength
    });

    drawConstructionLines(
      measurements,
      30,
      30,
      calculation.bustQuarter * 10
    );

    drawPattern(calculation, measurements);

    window.currentCalculation = calculation;

    return true;
  }

  if (button) {
    button.addEventListener("click", () => {
      generatePattern();
    });
  }

  // =========================================================
  // 方眼
  // =========================================================

  function drawGrid() {
    const width = 700;
    const height = 900;

    for (let x = 0; x <= width; x += 1) {
  const line = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  );

  line.setAttribute("x1", x);
  line.setAttribute("y1", 0);
  line.setAttribute("x2", x);
  line.setAttribute("y2", height);

  if (x % 10 === 0) {
    line.setAttribute("stroke", "#aaaaaa");
    line.setAttribute("stroke-width", "0.5");
  } else if (x % 5 === 0) {
    line.setAttribute("stroke", "#cccccc");
    line.setAttribute("stroke-width", "0.3");
  } else {
    line.setAttribute("stroke", "#eeeeee");
    line.setAttribute("stroke-width", "0.2");
  }

  line.setAttribute("class", "grid-line");

  canvas.appendChild(line);
}

    for (let y = 0; y <= height; y += 1) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", 0);
      line.setAttribute("y1", y);
      line.setAttribute("x2", width);
      line.setAttribute("y2", y);

      if (y % 10 === 0) {
        line.setAttribute("stroke", "#aaaaaa");
        line.setAttribute("stroke-width", "0.5");
      } else if (y % 5 === 0) {
        line.setAttribute("stroke", "#cccccc");
        line.setAttribute("stroke-width", "0.3");
      } else {
        line.setAttribute("stroke", "#eeeeee");
        line.setAttribute("stroke-width", "0.2");
      }
      line.setAttribute("class", "grid-line");

      canvas.appendChild(line);
    }

    for (let y = 0; y <= height; y += 10) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", 0);
      line.setAttribute("y1", y);
      line.setAttribute("x2", width);
      line.setAttribute("y2", y);
      line.setAttribute("stroke", "#84dbe3");
      line.setAttribute("stroke-width", "1");

      line.setAttribute("class", "grid-line");
      canvas.appendChild(line);
    }
    // =========================================================
// 方眼の表示状態を反映
// =========================================================

if (!isGridVisible) {
  const gridLines =
    canvas.querySelectorAll(".grid-line");

  gridLines.forEach((line) => {
    line.style.display = "none";
  });
}
  }

  // =========================================================
  // 型紙全体
  // =========================================================

  function drawPattern(calculation, measurements) {
    const topWidth = calculation.bustQuarter * 10;
    const bottomWidth = calculation.waistQuarter * 10;
    const height = measurements.length * 10;

    const points = {
      B: patternPoints.B,
      E: patternPoints.E,
      D: patternPoints.D,
      H: patternPoints.H
    };

    // 前身頃
    drawPiece(
      50,
      topWidth,
      bottomWidth,
      height,
      true,
      calculation,
      calculation.front,
      measurements,
      30,
      points
    );

    // 後身頃
    drawPiece(
      300,
      topWidth,
      bottomWidth,
      height,
      false,
      calculation,
      calculation.back,
      measurements,
      30,
      points
    );

    drawAllPatternPoints();
    updatePointList();
  }

  function drawWaistLine(x, waistY, width) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x);
    line.setAttribute("y1", waistY);
    line.setAttribute("x2", x + width);
    line.setAttribute("y2", waistY);
    line.setAttribute("stroke", "black");
    line.setAttribute("stroke-width", "0.8");

    canvas.appendChild(line);
  }

  // ==========================================
  // 曲線編集用の制御点を作成
  // ==========================================

  function addCurveControlPoint(name, x, y, part) {
    curveControlPoints[name] = { x: x, y: y, part: part };
  }

  function drawCurveControlPoints() {
    if (!selectedPatternPart) return;

    for (const name in curveControlPoints) {
      const control = curveControlPoints[name];
      if (control.part !== selectedPatternPart) continue;

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", control.x);
      circle.setAttribute("cy", control.y);
      circle.setAttribute("r", "4");
      circle.setAttribute("fill", "#ff9800");
      circle.setAttribute("class", "curve-control-point");
      circle.setAttribute("data-control-name", name);

      canvas.appendChild(circle);
    }
  }

  // ==========================================
  // 選択可能な型紙線を描画
  // ==========================================

  function drawSelectablePath(d, lineName) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("class", "pattern-curve pattern-selectable");
    path.setAttribute("data-line-name", lineName);
    path.setAttribute("stroke", "black");
    path.setAttribute("stroke-width", 2);

    canvas.appendChild(path);
    return path;
  }

  // イベントリスナー（一度だけ登録）
  if (canvas) {
    canvas.addEventListener("click", (event) => {
      if (currentMode !== "edit") return;

      const target = event.target;
      if (!target.classList.contains("pattern-selectable")) return;

      document.querySelectorAll(".pattern-selected").forEach((element) => {
        element.classList.remove("pattern-selected");
      });

      target.classList.add("pattern-selected");
      window.selectedPatternElement = target;

      const lineName = target.getAttribute("data-line-name");
      selectedPatternPart = lineName;

      const selectedLineNameEl = document.getElementById("selectedLineName");
      if (selectedLineNameEl) {
        selectedLineNameEl.textContent = lineName || "名称なし";
      }

      updateLineEditPanel();
      console.log("型紙線が選択されました：", lineName);

    });
  }
  // =========================================================
// 線の長さを計算
// =========================================================

function calculateLineLength(lineElement) {
  if (!lineElement) {
    return null;
  }

  try {
    const length = lineElement.getTotalLength();

    // SVG上では1cm = 10pxとして扱う
    const cm = length / 10;

    return cm;
  } catch (error) {
    console.error(
      "線の長さを計算できません:",
      error
    );

    return null;
  }
}

  function updateLineEditPanel() {
  const selectedLineNameEl =
    document.getElementById("selectedLineName");

  const currentName =
    selectedLineNameEl
      ? selectedLineNameEl.textContent
      : "";

  const message =
    document.getElementById("editPanelMessage");

  const valueElement =
    document.getElementById("lineAdjustmentValue");


  // 線が選択されていない
  if (
    !currentName ||
    currentName === "名称なし" ||
    currentName === "選択されていません"
  ) {
    if (message) {
      message.textContent =
        "編集する線を選択してください";
    }

    if (valueElement) {
      valueElement.value = 0;
    }

      // =====================================================
  // 線の長さを表示
  // =====================================================

  const lengthElement =
    document.getElementById("selectedLineLength");

  const selectedElement =
    window.selectedPatternElement;

  if (lengthElement && selectedElement) {

    const length =
      calculateLineLength(selectedElement);

    if (length !== null) {
      lengthElement.textContent =
        length.toFixed(1);
    } else {
      lengthElement.textContent =
        "---";
    }

  } else if (lengthElement) {

    lengthElement.textContent =
      "---";

  }

    return;
  }


  // 初期値
  if (
    lineAdjustments[currentName] === undefined
  ) {
    lineAdjustments[currentName] = 0;
  }


  // メッセージ
  if (message) {
    message.textContent =
      `${currentName} を編集します`;
  }


  // 数値を表示
  if (valueElement) {
    valueElement.value =
      lineAdjustments[currentName];
  }
}

// =========================================================
// 線の調整ボタン
// =========================================================

const lineDecreaseButton =
  document.getElementById("lineDecreaseButton");

const lineIncreaseButton =
  document.getElementById("lineIncreaseButton");

function changeLineAdjustment(amount) {
  if (!selectedPatternPart) {
    console.log("線が選択されていません");
    return;
  }

  const currentValue =
    lineAdjustments[selectedPatternPart] || 0;

  const newValue =
    Math.max(
      -20,
      Math.min(
        20,
        currentValue + amount
      )
    );

  if (newValue === currentValue) {
    return;
  }

  // Undo用
  pointHiatory.push({
    type: "line",
    lineName: selectedPatternPart,
    value: currentValue
  });

  // 新しい値
  lineAdjustments[selectedPatternPart] =
    newValue;

  // 新しい操作なのでRedoを削除
  redoHistory = [];

  // 表示更新
  updateLineEditPanel();

  // 型紙を再描画
  redrawPatternCurves();

  // ボタン状態更新
  updateHistoryButtons();

  console.log(
    "線を調整:",
    selectedPatternPart,
    newValue
  );
}

// =========================================================
// 縫い代ボタン
// =========================================================

if (addSeamAllowanceButton) {

  addSeamAllowanceButton.addEventListener("click", () => {

    // -----------------------------------------------------
    // 線が選択されているか確認
    // -----------------------------------------------------

    if (!selectedPatternPart) {

      alert("縫い代を付ける線を選択してください。");

      return;
    }

    // -----------------------------------------------------
    // 縫い代幅
    // -----------------------------------------------------

    const allowance =
      Number(seamAllowance?.value) || 0;

    if (allowance <= 0) {

      alert("縫い代幅を選択してください。");

      return;
    }

    // -----------------------------------------------------
    // 選択されているSVG要素
    // -----------------------------------------------------

    const selectedElement =
      window.selectedPatternElement;

    if (!selectedElement) {

      alert("線を取得できませんでした。");

      return;
    }

    // -----------------------------------------------------
    // 縫い代幅をSVG座標へ変換
    //
    // 1cm = 10px
    // -----------------------------------------------------

    const allowancePx =
      allowance * 10;

      // =====================================================
// 型紙の中心を取得
// =====================================================

const patternElements =
  canvas.querySelectorAll(
    ".pattern-selectable, .pattern-curve"
  );

let centerX = 0;
let centerY = 0;
let centerCount = 0;

patternElements.forEach((element) => {

  // 縫い代線は除外
  if (
    element.classList.contains(
      "seam-allowance"
    )
  ) {
    return;
  }

  try {

    const box =
      element.getBBox();

    centerX +=
      box.x + box.width / 2;

    centerY +=
      box.y + box.height / 2;

    centerCount++;

  } catch (error) {

    console.warn(
      "中心取得失敗:",
      error
    );

  }

});

if (centerCount > 0) {

  centerX /= centerCount;
  centerY /= centerCount;

}

    // =====================================================
    // PATHの場合
    // =====================================================

    if (
      selectedElement.tagName &&
      selectedElement.tagName.toLowerCase() === "path"
    ) {

      const pathData =
        selectedElement.getAttribute("d");

      if (!pathData) {

        alert("この線には縫い代を付けられません。");

        return;
      }

      // ---------------------------------------------------
      // パスの形状を取得
      // ---------------------------------------------------

      const totalLength =
        selectedElement.getTotalLength();

      if (!totalLength || totalLength <= 0) {

        alert("線の長さを取得できませんでした。");

        return;
      }

      // ---------------------------------------------------
      // パスを細かくサンプリング
      // ---------------------------------------------------

      const points = [];

      const step = 5;

      for (
        let distance = 0;
        distance <= totalLength;
        distance += step
      ) {

        const point =
          selectedElement.getPointAtLength(distance);

        points.push({
          x: point.x,
          y: point.y
        });

      }

      // 最後の点を必ず追加

      const lastPoint =
        selectedElement.getPointAtLength(totalLength);

      points.push({
        x: lastPoint.x,
        y: lastPoint.y
      });

      // ---------------------------------------------------
      // 各点について法線方向を計算
      // ---------------------------------------------------

      const offsetPoints = [];

      for (
        let i = 0;
        i < points.length;
        i++
      ) {

        const current =
          points[i];

        let previous;
        let next;

        if (i === 0) {

          previous = points[i];
          next = points[i + 1];

        } else if (i === points.length - 1) {

          previous = points[i - 1];
          next = points[i];

        } else {

          previous = points[i - 1];
          next = points[i + 1];

        }

        // 接線方向

        const dx =
          next.x - previous.x;

        const dy =
          next.y - previous.y;

        const length =
          Math.sqrt(
            dx * dx +
            dy * dy
          );

        if (length === 0) {
          continue;
        }

        // -------------------------------------------------
        // 法線方向
        // -------------------------------------------------

       // =====================================================
// 2方向の法線を計算
// =====================================================

let nx =
  dy / length;

let ny =
  -dx / length;

// 反対側の法線
const oppositeNX =
  -nx;

const oppositeNY =
  -ny;

// =====================================================
// 現在位置から型紙中心への方向
// =====================================================

const toCenterX =
  centerX - current.x;

const toCenterY =
  centerY - current.y;

// 法線と中心方向の内積
const dot =
  nx * toCenterX +
  ny * toCenterY;

// =====================================================
// 中心から離れる方向を選択
// =====================================================

if (dot > 0) {

  nx =
    oppositeNX;

  ny =
    oppositeNY;

}

        offsetPoints.push({

          x:
            current.x +
            nx * allowancePx,

          y:
            current.y +
            ny * allowancePx

        });

      }

      // ---------------------------------------------------
      // 縫い代PATHを作成
      // ---------------------------------------------------

      if (offsetPoints.length < 2) {

        alert("縫い代を作成できませんでした。");

        return;
      }

      let seamPathData =
        `M ${offsetPoints[0].x} ${offsetPoints[0].y}`;

      for (
        let i = 1;
        i < offsetPoints.length;
        i++
      ) {

        seamPathData +=
          ` L ${offsetPoints[i].x} ${offsetPoints[i].y}`;

      }

      // ---------------------------------------------------
      // SVG PATH
      // ---------------------------------------------------

      const seamPath =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );

      seamPath.setAttribute(
        "d",
        seamPathData
      );

      seamPath.setAttribute(
        "fill",
        "none"
      );

      seamPath.setAttribute(
        "stroke",
        "#2196f3"
      );

      seamPath.setAttribute(
        "stroke-width",
        "1"
      );

      seamPath.setAttribute(
        "class",
        "seam-allowance"
      );

      // 元の線を記録

      seamPath.dataset.sourcePart =
        selectedPatternPart;

      seamPath.dataset.allowance =
        allowance;

      canvas.appendChild(
        seamPath
      );

      console.log(
        "曲線の縫い代を作成しました:",
        selectedPatternPart,
        allowance,
        "cm"
      );

      return;
    }

    // =====================================================
    // LINEの場合
    // =====================================================

    if (
      selectedElement.tagName &&
      selectedElement.tagName.toLowerCase() === "line"
    ) {

      const x1 =
        Number(selectedElement.getAttribute("x1"));

      const y1 =
        Number(selectedElement.getAttribute("y1"));

      const x2 =
        Number(selectedElement.getAttribute("x2"));

      const y2 =
        Number(selectedElement.getAttribute("y2"));

      const dx =
        x2 - x1;

      const dy =
        y2 - y1;

      const length =
        Math.sqrt(
          dx * dx +
          dy * dy
        );

      if (length === 0) {

        alert("線の長さが0です。");

        return;
      }

      // ---------------------------------------------------
      // 垂直方向
      // ---------------------------------------------------

     let nx =
  dy / length;

let ny =
  -dx / length;

// 線の中心
const lineCenterX =
  (x1 + x2) / 2;

const lineCenterY =
  (y1 + y2) / 2;

// 中心方向
const toCenterX =
  centerX - lineCenterX;

const toCenterY =
  centerY - lineCenterY;

// 内側を向いていたら反転
const dot =
  nx * toCenterX +
  ny * toCenterY;

if (dot > 0) {

  nx =
    -nx;

  ny =
    -ny;

}

const offsetX =
  nx * allowancePx;

const offsetY =
  ny * allowancePx;

      // ---------------------------------------------------
      // 縫い代線
      // ---------------------------------------------------

      const seamPath =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );

      seamPath.setAttribute(
        "d",
        `M ${x1 + offsetX} ${y1 + offsetY}
         L ${x2 + offsetX} ${y2 + offsetY}`
      );

      seamPath.setAttribute(
        "fill",
        "none"
      );

      seamPath.setAttribute(
        "stroke",
        "#2196f3"
      );

      seamPath.setAttribute(
        "stroke-width",
        "1"
      );

      seamPath.setAttribute(
        "class",
        "seam-allowance"
      );

      seamPath.dataset.sourcePart =
        selectedPatternPart;

      seamPath.dataset.allowance =
        allowance;

      canvas.appendChild(
        seamPath
      );

      console.log(
        "直線の縫い代を作成しました:",
        selectedPatternPart,
        allowance,
        "cm"
      );

      return;
    }

    // =====================================================
    // 対応していない要素
    // =====================================================

    alert(
      "この線の種類にはまだ対応していません。"
    );

  });

}

// −ボタン
if (lineDecreaseButton) {
  lineDecreaseButton.addEventListener(
    "click",
    () => {
      changeLineAdjustment(-1);
    }
  );
}


// ＋ボタン
if (lineIncreaseButton) {
  lineIncreaseButton.addEventListener(
    "click",
    () => {
      changeLineAdjustment(1);
    }
  );
}

// =========================================================
// 印刷用表示
// =========================================================

if (printPreviewButton) {
  printPreviewButton.addEventListener("click", () => {

    const patternPoints =
      document.querySelectorAll(".pattern-point");

    const curvePoints =
      document.querySelectorAll(".curve-control-point");

    const isPrintPreview =
      document.body.classList.contains("print-preview");

    // =====================================================
    // 印刷用表示にする
    // =====================================================

    if (!isPrintPreview) {

      document.body.classList.add("print-preview");

      // ピンクのポイントを消す
      patternPoints.forEach((point) => {
        point.style.display = "none";
      });

      // 曲線編集ポイントも消す
      curvePoints.forEach((point) => {
        point.style.display = "none";
      });

      printPreviewButton.textContent =
        "通常表示に戻す";

      console.log("印刷用表示に切り替えました");

    }

    // =====================================================
    // 通常表示に戻す
    // =====================================================

    else {

      document.body.classList.remove("print-preview");

      // ピンクのポイントを戻す
      patternPoints.forEach((point) => {
        point.style.display = "";
      });

      // 曲線編集ポイントも戻す
      curvePoints.forEach((point) => {
        point.style.display = "";
      });

      printPreviewButton.textContent =
        "印刷用表示";

      console.log("通常表示に戻しました");
    }

  });
}

// =========================================================
// 印刷
// =========================================================

if (printButton) {

  printButton.addEventListener("click", () => {

    // 型紙が作成されているか確認
    if (!measurements || !window.currentCalculation) {
      alert("先に型紙を作成してください。");
      return;
    }

    // 印刷モード
    const printMode =
      document.querySelector(
        'input[name="printMode"]:checked'
      )?.value;

    console.log("印刷モード:", printMode);

    // =====================================================
    // 編集ポイントを一時的に非表示
    // =====================================================

    const patternPoints =
      document.querySelectorAll(".pattern-point");

    const curvePoints =
      document.querySelectorAll(".curve-control-point");

    patternPoints.forEach((point) => {
      point.style.display = "none";
    });

    curvePoints.forEach((point) => {
      point.style.display = "none";
    });

    // =====================================================
    // A4 1枚に収める
    // =====================================================

    if (printMode === "fit") {

      document.body.classList.add("print-fit-mode");

      setTimeout(() => {

        window.print();

        document.body.classList.remove(
          "print-fit-mode"
        );

        patternPoints.forEach((point) => {
          point.style.display = "";
        });

        curvePoints.forEach((point) => {
          point.style.display = "";
        });

      }, 100);

      return;
    }

    // =====================================================
    // A4分割印刷
    // =====================================================

    if (printMode === "split") {

      printPatternA4Split();

      return;
    }

    // =====================================================
    // 通常印刷
    // =====================================================

    setTimeout(() => {

      window.print();

      patternPoints.forEach((point) => {
        point.style.display = "";
      });

      curvePoints.forEach((point) => {
        point.style.display = "";
      });

    }, 100);

  });

}
// =========================================================
// A4貼り合わせ用 合印
// =========================================================

function createA4RegistrationMark(
  svg,
  x,
  y,
  direction
) {

  const ns =
    "http://www.w3.org/2000/svg";

  const size = 5;

  // -----------------------------
  // 横方向の合印
  // -----------------------------

  if (direction === "horizontal") {

    const line1 =
      document.createElementNS(
        ns,
        "line"
      );

    line1.setAttribute(
      "x1",
      x - size
    );

    line1.setAttribute(
      "y1",
      y
    );

    line1.setAttribute(
      "x2",
      x + size
    );

    line1.setAttribute(
      "y2",
      y
    );

    line1.setAttribute(
      "stroke",
      "black"
    );

    line1.setAttribute(
      "stroke-width",
      "0.7"
    );

    line1.setAttribute(
      "pointer-events",
      "none"
    );

    svg.appendChild(line1);


    const line2 =
      document.createElementNS(
        ns,
        "line"
      );

    line2.setAttribute(
      "x1",
      x
    );

    line2.setAttribute(
      "y1",
      y - size
    );

    line2.setAttribute(
      "x2",
      x
    );

    line2.setAttribute(
      "y2",
      y + size
    );

    line2.setAttribute(
      "stroke",
      "black"
    );

    line2.setAttribute(
      "stroke-width",
      "0.7"
    );

    line2.setAttribute(
      "pointer-events",
      "none"
    );

    svg.appendChild(line2);

  }

  // -----------------------------
  // 縦方向の合印
  // -----------------------------

  if (direction === "vertical") {

    const line1 =
      document.createElementNS(
        ns,
        "line"
      );

    line1.setAttribute(
      "x1",
      x - size
    );

    line1.setAttribute(
      "y1",
      y
    );

    line1.setAttribute(
      "x2",
      x + size
    );

    line1.setAttribute(
      "y2",
      y
    );

    line1.setAttribute(
      "stroke",
      "black"
    );

    line1.setAttribute(
      "stroke-width",
      "0.7"
    );

    line1.setAttribute(
      "pointer-events",
      "none"
    );

    svg.appendChild(line1);


    const line2 =
      document.createElementNS(
        ns,
        "line"
      );

    line2.setAttribute(
      "x1",
      x
    );

    line2.setAttribute(
      "y1",
      y - size
    );

    line2.setAttribute(
      "x2",
      x
    );

    line2.setAttribute(
      "y2",
      y + size
    );

    line2.setAttribute(
      "stroke",
      "black"
    );

    line2.setAttribute(
      "stroke-width",
      "0.7"
    );

    line2.setAttribute(
      "pointer-events",
      "none"
    );

    svg.appendChild(line2);

  }
}

// =========================================================
// A4分割印刷
// =========================================================

function printPatternA4Split() {

  const originalSvg =
    document.getElementById("canvas");

  if (!originalSvg) {
    alert("型紙キャンバスが見つかりません。");
    return;
  }

  // =====================================================
  // 型紙だけの範囲を取得
  // =====================================================

  const elements =
    originalSvg.querySelectorAll(
      ".pattern-selectable, .pattern-curve, path:not(.seam-allowance), line:not(.grid-line), text"
    );

  if (!elements.length) {
    alert("印刷する型紙が見つかりません。");
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach((element) => {

    // A4ガイドは除外
    if (
      element.closest("#a4GuideLayer")
    ) {
      return;
    }

    try {

      const box =
        element.getBBox();

      if (
        !isFinite(box.x) ||
        !isFinite(box.y) ||
        !isFinite(box.width) ||
        !isFinite(box.height)
      ) {
        return;
      }

      minX =
        Math.min(minX, box.x);

      minY =
        Math.min(minY, box.y);

      maxX =
        Math.max(
          maxX,
          box.x + box.width
        );

      maxY =
        Math.max(
          maxY,
          box.y + box.height
        );

    } catch (error) {

      console.warn(
        "範囲取得失敗:",
        element,
        error
      );

    }

  });

  // =====================================================
  // 範囲が取得できなかった場合
  // =====================================================

  if (
    !isFinite(minX) ||
    !isFinite(minY) ||
    !isFinite(maxX) ||
    !isFinite(maxY)
  ) {

    alert(
      "型紙の印刷範囲を取得できませんでした。"
    );

    return;
  }

  // =====================================================
  // 少しだけ余白を追加
  // =====================================================

  const margin = 10;

  minX -= margin;
  minY -= margin;
  maxX += margin;
  maxY += margin;

  const patternWidth =
    maxX - minX;

  const patternHeight =
    maxY - minY;

  // =====================================================
  // このアプリでは
  //
  // 1cm = 10 SVG単位
  // 1mm = 1 SVG単位
  //
  // なのでA4は
  //
  // 210 × 297
  //
  // =====================================================

  const A4_WIDTH = 210;
  const A4_HEIGHT = 297;

  const columns =
    Math.max(
      1,
      Math.ceil(
        patternWidth / A4_WIDTH
      )
    );

  const rows =
    Math.max(
      1,
      Math.ceil(
        patternHeight / A4_HEIGHT
      )
    );

  const pageCount =
    columns * rows;

  console.log(
    "実際の型紙範囲:",
    patternWidth,
    "×",
    patternHeight
  );

  console.log(
    "A4分割:",
    columns,
    "列 ×",
    rows,
    "行 =",
    pageCount,
    "枚"
  );

  // =====================================================
  // 印刷用HTMLを作成
  // =====================================================

  let pagesHTML = "";

  for (
    let row = 0;
    row < rows;
    row++
  ) {

    for (
      let col = 0;
      col < columns;
      col++
    ) {

      const tileX =
        minX +
        col * A4_WIDTH;

      const tileY =
        minY +
        row * A4_HEIGHT;

      // SVGを複製
      const pageSvg =
        originalSvg.cloneNode(true);

      // =================================================
      // 印刷ページ用の設定
      // =================================================

      pageSvg.setAttribute(
        "width",
        "210mm"
      );

      pageSvg.setAttribute(
        "height",
        "297mm"
      );

      pageSvg.setAttribute(
        "viewBox",
        `${tileX} ${tileY} ${A4_WIDTH} ${A4_HEIGHT}`
      );

      pageSvg.style.width =
        "210mm";

      pageSvg.style.height =
        "297mm";

      pageSvg.style.display =
        "block";

      // =================================================
      // 不要なものを削除
      // =================================================

      pageSvg
        .querySelectorAll(
          ".grid-line, #a4GuideLayer, .pattern-point, .curve-control-point"
        )
        .forEach((element) => {
          element.remove();
        });

      // =================================================
      // ページ番号
      // =================================================

      const pageNumber =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );

      pageNumber.setAttribute(
        "x",
        tileX + 5
      );

      pageNumber.setAttribute(
        "y",
        tileY + 10
      );

      pageNumber.setAttribute(
        "font-size",
        "5"
      );

      pageNumber.setAttribute(
        "fill",
        "black"
      );

      pageNumber.textContent =
        `A4 ${row * columns + col + 1} / ${pageCount}`;

      pageSvg.appendChild(
        pageNumber
      );

      // =================================================
// A4貼り合わせ用 合印
// =================================================

// 右隣のA4との境界
if (col < columns - 1) {

  createA4RegistrationMark(
    pageSvg,
    tileX + A4_WIDTH,
    tileY + A4_HEIGHT / 2,
    "horizontal"
  );

}

// 下のA4との境界
if (row < rows - 1) {

  createA4RegistrationMark(
    pageSvg,
    tileX + A4_WIDTH / 2,
    tileY + A4_HEIGHT,
    "vertical"
  );
}

      // =================================================
// 実寸確認用 100mm
// =================================================

const checkLine =
  document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  );

checkLine.setAttribute(
  "x1",
  tileX + 10
);

checkLine.setAttribute(
  "y1",
  tileY + 285
);

checkLine.setAttribute(
  "x2",
  tileX + 110
);

checkLine.setAttribute(
  "y2",
  tileY + 285
);

checkLine.setAttribute(
  "stroke",
  "black"
);

checkLine.setAttribute(
  "stroke-width",
  "0.5"
);

checkLine.setAttribute(
  "class",
  "print-check-line"
);

pageSvg.appendChild(
  checkLine
);


const checkText =
  document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text"
  );

checkText.setAttribute(
  "x",
  tileX + 50
);

checkText.setAttribute(
  "y",
  tileY + 280
);

checkText.setAttribute(
  "font-size",
  "5"
);

checkText.setAttribute(
  "text-anchor",
  "middle"
);

checkText.textContent =
  "100 mm";

pageSvg.appendChild(
  checkText
);

      // =================================================
      // 印刷ページ
      // =================================================

      pagesHTML += `
        <div class="print-page">
          ${new XMLSerializer().serializeToString(pageSvg)}
        </div>
      `;

    }

  }

  // =====================================================
  // 印刷用ウィンドウ
  // =====================================================

  const printWindow =
    window.open(
      "",
      "_blank"
    );

  if (!printWindow) {

    alert(
      "印刷画面を開けませんでした。\n" +
      "ブラウザのポップアップを許可してください。"
    );

    return;
  }

  printWindow.document.open();

  printWindow.document.write(`

    <!DOCTYPE html>

    <html>

    <head>

      <meta charset="UTF-8">

      <title>Pattern Studio A4印刷</title>

      <style>

        @page {
          size: A4 portrait;
          margin: 0;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: white;
        }

        .print-page {

          width: 210mm;
          height: 297mm;

          page-break-after: always;

          break-after: page;

          overflow: hidden;

        }

        .print-page:last-child {

          page-break-after: auto;

          break-after: auto;

        }

        .print-page svg {

          width: 210mm !important;
          height: 297mm !important;

          display: block;

        }

        @media print {

          html,
          body {

            margin: 0;
            padding: 0;

          }

        }

      </style>

    </head>

    <body>

      ${pagesHTML}

    </body>

    </html>

  `);

  printWindow.document.close();

  // =====================================================
  // 印刷画面が読み込まれたら印刷
  // =====================================================

  printWindow.onload = () => {

    setTimeout(() => {

      printWindow.focus();

      printWindow.print();

    }, 500);

  };

}

// =========================================================
// パーツ全体に縫い代
// =========================================================

if (addPartSeamAllowanceButton) {

  addPartSeamAllowanceButton.addEventListener(
    "click",
    () => {

      if (!selectedPatternPart) {

        alert(
          "先に編集モードで型紙パーツを選択してください。"
        );

        return;
      }

      addSeamAllowanceToSelectedPart();

    }
  );

}

  // =========================================================
// 選択した線を動かす
// =========================================================

function adjustSelectedLine(amount) {
  if (!selectedPatternPart) {
    console.log("編集する線が選択されていません");
    return;
  }

  // 現在の調整値を取得
  if (lineAdjustments[selectedPatternPart] === undefined) {
    lineAdjustments[selectedPatternPart] = 0;
  }

  lineAdjustments[selectedPatternPart] += amount;

  // 表示更新
  updateLineEditPanel();

  // 型紙を再描画
  redrawPatternCurves();

  console.log(
    "線を調整しました:",
    selectedPatternPart,
    lineAdjustments[selectedPatternPart]
  );
}


    
// =========================================================
// 方眼の表示 / 非表示
// =========================================================

let isGridVisible = true;

if (toggleGridButton) {
  toggleGridButton.addEventListener("click", () => {

    isGridVisible = !isGridVisible;

    const gridLines =
      document.querySelectorAll(".grid-line");

    gridLines.forEach((line) => {
      line.style.display =
        isGridVisible ? "" : "none";
    });

    toggleGridButton.textContent =
      isGridVisible
        ? "方眼を非表示"
        : "方眼を表示";

  });
}

  // =========================================================
  // 身頃
  // =========================================================
function drawPiece(
  x,
  topWidth,
  bottomWidth,
  height,
  isFront,
  calculation,
  piece,
  measurements,
  y,
  points
) {

  // =========================================================
  // 使用するポイント
  // =========================================================

  const shoulderPoint = isFront
    ? patternPoints.frontShoulder
    : patternPoints.backShoulder;

  const armholePoint = isFront
    ? patternPoints.frontArmhole
    : patternPoints.backArmhole;

  const waistPoint = isFront
    ? patternPoints.frontWaist
    : patternPoints.backWaist;

  const hipPoint = isFront
    ? patternPoints.frontHip
    : patternPoints.backHip;

  // =========================================================
  // 線の調整値
  // =========================================================

  const shoulderName =
    isFront ? "front-shoulder" : "back-shoulder";

  const armholeName =
    isFront
      ? "前身頃：アームホール"
      : "後身頃：アームホール";

  const sideName =
    isFront
      ? "前身頃：脇線"
      : "後身頃：脇線";

  const hipName =
    isFront
      ? "前身頃：ヒップ線"
      : "後身頃：ヒップ線";

  const hemName =
    isFront
      ? "前身頃：裾線"
      : "後身頃：裾線";

  const centerName =
    isFront
      ? "前身頃：中心線"
      : "後身頃：中心線";

  const necklineName =
    isFront
      ? "前身頃：襟ぐり"
      : "後身頃：襟ぐり";

  const shoulderAdjust =
    lineAdjustments[shoulderName] || 0;

  const armholeAdjust =
    lineAdjustments[armholeName] || 0;

  const sideAdjust =
    lineAdjustments[sideName] || 0;

  const hipAdjust =
    lineAdjustments[hipName] || 0;

const necklineAdjust =
  lineAdjustments[necklineName] || 0;

  //=====================================================
  // 基本寸法
  // =========================================================

  const scale = 10;

  const neckWidth = 40;

  const neckDepth =
    (piece && piece.neckDepth)
      ? piece.neckDepth
      : (isFront ? 15 : 5);

  const armholeDepth =
    calculation.armholeDepth * scale;

  // =========================================================
  // 各ポイント
  // =========================================================

  const centerX = x;
  const topY = y;

  // 首の付け根
  const neckStartX = x + neckWidth;
  const neckStartY = y;

  // 肩先
  const shoulderX = shoulderPoint
    ? shoulderPoint.x
    : x + neckWidth + measurements.shoulderWidth * 5;

    const shoulderY = shoulderPoint
  ? shoulderPoint.y + shoulderAdjust
  : y + (isFront ? 18 : 14) + shoulderAdjust;

  // 袖ぐり終点
  const armholeX = armholePoint
    ? armholePoint.x + armholeAdjust
    : x + topWidth + armholeAdjust;

  const armholeY = armholePoint
    ? armholePoint.y + armholeAdjust
    : y + armholeDepth + armholeAdjust;

  // ウエスト
  const waistX = waistPoint
    ? waistPoint.x + sideAdjust
    : x + calculation.waistQuarter * scale + sideAdjust;

  const waistY = waistPoint
    ? waistPoint.y
    : y + calculation.waistY;

  // ヒップ
  const hipX = hipPoint
    ? hipPoint.x + sideAdjust + hipAdjust
    : x + calculation.hipQuarter * scale
        + sideAdjust
        + hipAdjust;

  const hipY = hipPoint
    ? hipPoint.y
    : y + calculation.hipY;

  // 裾
const bottomX =
  x +
  calculation.hipQuarter * scale +
  sideAdjust +
  hipAdjust;
  const bottomY =
  Math.max(
    y + height,
    hipY + 100
  );

  // =========================================================
  // ① 肩線
  // =========================================================

  const shoulderPath =
    `M ${neckStartX} ${neckStartY}
     L ${shoulderX} ${shoulderY}`;

  drawSelectablePath(
  shoulderPath,
  shoulderName
);
  // =========================================================
  // ② アームホール
  // =========================================================

  const control1X =
    shoulderX + (armholeX - shoulderX) * 0.35;

  const control1Y =
    shoulderY + (armholeY - shoulderY) * 0.15;

  const control2X =
    shoulderX + (armholeX - shoulderX) * 0.85;

  const control2Y =
    shoulderY + (armholeY - shoulderY) * 0.75;

  drawSelectablePath(
    `M ${shoulderX} ${shoulderY}
     C ${control1X} ${control1Y},
       ${control2X} ${control2Y},
       ${armholeX} ${armholeY}`,
    armholeName
  );

  // =========================================================
  // ③ 脇線
  // =========================================================

  const sideControl1X =
    armholeX + (waistX - armholeX) * 0.25;

  const sideControl1Y =
    armholeY + (waistY - armholeY) * 0.35;

  const sideControl2X =
    waistX + (hipX - waistX) * 0.15;

  const sideControl2Y =
    waistY + (hipY - waistY) * 0.45;

  drawSelectablePath(
    `M ${armholeX} ${armholeY}
     C ${sideControl1X} ${sideControl1Y},
       ${sideControl2X} ${sideControl2Y},
       ${hipX} ${hipY}`,
    sideName
  );

  // =========================================================
  // ④ ヒップから裾
  // =========================================================

  const hipControl1X =
    hipX + (bottomX - hipX) * 0.15;

  const hipControl1Y =
    hipY + (bottomY - hipY) * 0.30;

  const hipControl2X =
    bottomX - 10;

  const hipControl2Y =
    bottomY - 25;

  drawSelectablePath(
    `M ${hipX} ${hipY}
     C ${hipControl1X} ${hipControl1Y},
       ${hipControl2X} ${hipControl2Y},
       ${bottomX} ${bottomY}`,
    hipName
  );

  // =========================================================
  // ⑤ 裾線
  // =========================================================

  drawSelectablePath(
    `M ${bottomX} ${bottomY}
     L ${centerX} ${bottomY}`,
    hemName
  );

  // =========================================================
  // ⑥ 中心線
  // =========================================================

  drawSelectablePath(
    `M ${centerX} ${topY}
     L ${centerX} ${bottomY}`,
    centerName
  );

  // =========================================================
// ⑦ 襟ぐり
// =========================================================

// 襟ぐりの調整
const neckControlX =
  x + neckWidth * 0.25;

const neckControlY =
  y +
  neckDepth * scale * 0.9 +
  necklineAdjust;

drawSelectablePath(
  `M ${centerX} ${topY}
   Q ${neckControlX} ${neckControlY},
     ${neckStartX} ${neckStartY}`,
  necklineName
);

  // =========================================================
  // ⑧ ウエスト基準線
  // =========================================================

  drawWaistLine(
    centerX,
    waistY,
    waistX - centerX
  );

  // =========================================================
  // ⑨ ダーツ
  // =========================================================

  const dart = calculateDart(
    x,
    y,
    topWidth,
    calculation,
    piece,
    measurements
  );

  if (dart && dart.dartAmount > 0) {

    const dartPath =
      `M ${dart.dartLeftX} ${waistY}
       L ${dart.dartX} ${dart.dartTopY}
       L ${dart.dartRightX} ${waistY}`;

    const dartElement =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );

    dartElement.setAttribute(
      "d",
      dartPath
    );

    dartElement.setAttribute(
      "stroke",
      "black"
    );

    dartElement.setAttribute(
      "stroke-width",
      "1"
    );

    dartElement.setAttribute(
      "fill",
      "none"
    );

    canvas.appendChild(dartElement);

    // =======================================================
// ダーツ位置ポイント
// =======================================================

const dartPoint =
  document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle"
  );

dartPoint.setAttribute(
  "cx",
  dart.dartX
);

dartPoint.setAttribute(
  "cy",
  dart.dartTopY
);

dartPoint.setAttribute(
  "r",
  "5"
);

dartPoint.setAttribute(
  "fill",
  "#9c27b0"
);

dartPoint.setAttribute(
  "stroke",
  "white"
);

dartPoint.setAttribute(
  "stroke-width",
  "1"
);

dartPoint.setAttribute(
  "class",
  "dart-position-point"
);

dartPoint.setAttribute(
  "data-dart-part",
  isFront ? "front" : "back"
);

canvas.appendChild(
  dartPoint
);

    // ダーツ量表示
    const dartLabel =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );

    dartLabel.setAttribute(
      "x",
      dart.dartX + 4
    );

    dartLabel.setAttribute(
      "y",
      dart.dartTopY
    );

    dartLabel.setAttribute(
      "font-size",
      "5"
    );

    dartLabel.textContent =
      `${dart.dartAmount.toFixed(1)}cm`;

    canvas.appendChild(dartLabel);
  }
}

  // =========================================================
  // ヘルパー / 計算 / 描画関数
  // =========================================================

  function drawPatternSegment(d, className) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "black");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("class", className);
    canvas.appendChild(path);
  }

  function calculateBodiceMeasurements(m) {
    return {
      frontNeckDepth: 15,
      backNeckDepth: 5
    };
  }

  function calculatePattern(m, bodice, frontDart, backDart) {
    const bustQuarter = m.bust / 4;
    const waistQuarter = m.waist / 4;
    const hipQuarter = m.hip / 4;
    const armholeDepth = m.height * 0.12;
    const waistY = m.backlength * 10;
    const hipY = waistY + 180;
    const waistDifference = Math.max(0, bustQuarter - waistQuarter);

    return {
      bustQuarter,
      waistQuarter,
      hipQuarter,
      armholeDepth,
      waistY,
      hipY,
      waistDifference,
      front: { neckDepth: 15 },
      back: { neckDepth: 5 }
    };
  }
   function createBodeicePoints(startX, startY, m, calc) {
  const scale = 10;

  // =======================================================
  // 前身頃
  // =======================================================

  const frontX = startX;
  const frontY = startY;

  const frontTopWidth = calc.bustQuarter * scale;

  patternPoints.frontShoulder = {
    x: frontX + 40 + m.shoulderWidth * 5.1,
    y: frontY + 18,
    name: "前肩先",
    part: "front"
  };

  patternPoints.frontArmhole = {
    x: frontX + frontTopWidth,
    y: frontY + calc.armholeDepth * scale,
    name: "前袖ぐり",
    part: "front"
  };

  patternPoints.frontWaist = {
    x: frontX + calc.waistQuarter * scale,
    y: frontY + calc.waistY,
    name: "前ウエスト",
    part: "front"
  };

  patternPoints.frontHip = {
    x: frontX + calc.hipQuarter * scale,
    y: frontY + calc.hipY,
    name: "前ヒップ",
    part: "front"
  };

  // =======================================================
  // 後身頃
  // =======================================================

  const backX = 300;
  const backY = startY;

  const backTopWidth = calc.bustQuarter * scale;

  patternPoints.backShoulder = {
    x: backX + 40 + m.shoulderWidth * 4.9,
    y: backY + 14,
    name: "後肩先",
    part: "back"
  };

  patternPoints.backArmhole = {
    x: backX + backTopWidth,
    y: backY + calc.armholeDepth * scale,
    name: "後袖ぐり",
    part: "back"
  };

  patternPoints.backWaist = {
    x: backX + calc.waistQuarter * scale,
    y: backY + calc.waistY,
    name: "後ウエスト",
    part: "back"
  };

  patternPoints.backHip = {
    x: backX + calc.hipQuarter * scale,
    y: backY + calc.hipY,
    name: "後ヒップ",
    part: "back"
  };
}

  function drawConstructionLines(m, x, y, width) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x);
    line.setAttribute("y1", y);
    line.setAttribute("x2", x + width);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "#cccccc");
    canvas.appendChild(line);
  }

  function drawAllPatternPoints() {
    for (const key in patternPoints) {
      const p = patternPoints[key];
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", p.x);
      circle.setAttribute("cy", p.y);
      circle.setAttribute("r", "5");
      circle.setAttribute("fill", "#e91e63");
      circle.setAttribute("class", "pattern-point");
      circle.setAttribute("data-point-name", key);
      canvas.appendChild(circle);
    }
  }

  // =========================================================
  // ポイント一覧
  // =========================================================

  function updatePointList() {
    const pointList = document.getElementById("pointList");

    if (!pointList) {
      return;
    }

    pointList.innerHTML = "";

    for (const name in patternPoints) {
      if (!Object.prototype.hasOwnProperty.call(patternPoints, name)) {
        continue;
      }

      const point = patternPoints[name];

      const row = document.createElement("div");
      row.className = "point-row";

      row.innerHTML = `
        <span>${name}</span>
        <span>${Number(point.x || 0).toFixed(1)}</span>
        <span>${Number(point.y || 0).toFixed(1)}</span>
      `;

      pointList.appendChild(row);
    }
  }

  // =========================================================
  // 型紙の再描画
  // =========================================================

  function redrawPatternCurves() {
    if (!measurements || !window.currentCalculation) {
      return;
    }

    // 現在選択されている線を記録
    const selectedElement = window.selectedPatternElement;

    const selectedLineName = selectedElement
      ? selectedElement.getAttribute("data-line-name")
      : null;

  // =====================================================
// A4ガイドを一時保存
// =====================================================

const a4Guide =
  canvas.querySelector("#a4GuideLayer");

// =====================================================
// キャンバスをクリア
// =====================================================

canvas.innerHTML = "";

// =====================================================
// 方眼
// =====================================================

drawGrid();

// =====================================================
// 型紙
// =====================================================

drawPattern(
  window.currentCalculation,
  measurements
);

// =====================================================
// A4ガイドを最後に復元
// =====================================================

if (a4Guide) {

  canvas.appendChild(
    a4Guide
  );

}
    // 曲線制御点
    drawCurveControlPoints();

    // 選択状態を復元
    if (selectedLineName) {
      const selectable = canvas.querySelector(
        `[data-line-name="${selectedLineName}"]`
      );

      if (selectable) {
        selectable.classList.add("pattern-selected");
        window.selectedPatternElement = selectable;
        selectedPatternPart = selectedLineName;
      } else {
        window.selectedPatternElement = null;
        selectedPatternPart = null;
      }
    }

    // ポイント一覧も更新
    updatePointList();
    updateLineEditPanel();
  }

  // =========================================================
  // ダーツ計算
  // =========================================================

function calculateDart(
  x,
  y,
  topWidth,
  calculation,
  piece,
  measurements
) {
  const scale = 10;

  // =======================================================
  // ダーツ量
  // =======================================================

  let inputAmount = 0;

  if (piece === calculation.front) {

    const input =
      document.getElementById("frontDartAmount");

    inputAmount =
      Number(input?.value) || 0;

  } else {

    const input =
      document.getElementById("backDartAmount");

    inputAmount =
      Number(input?.value) || 0;
  }

  inputAmount =
    Math.max(0, inputAmount);

  const dartAmount =
    inputAmount * scale;

  // =======================================================
  // バストポイントを基準にする
  // =======================================================

  const bustPoint =
    Number(measurements?.bustPoint) || 0;

  // 型紙上のバストポイント
  let dartX = x;
  let dartY = y + bustPoint * scale;

  // =======================================================
  // 前身頃
  // =======================================================

  if (piece === calculation.front) {

    // 前身頃のダーツ位置
    dartX =
      x +
      (Number(frontDartPosition) || 0) * scale + 4 * scale;
;

  }

  // =======================================================
  // 後身頃
  // =======================================================

  if (piece === calculation.back) {

    // 後身頃のダーツ位置
    dartX =
      x +
      (Number(backDartPosition) || 0) * scale
       + 4 * scale;

  }

  // =======================================================
  // ダーツ先端
  // =======================================================
  // バストポイントそのものではなく、
  // 少し手前で止める

  const dartTopY =
    dartY - 2 * scale;

  // =======================================================
  // ダーツ左右
  // =======================================================

  const halfDartAmount =
    dartAmount / 2;

  const dartLeftX =
    dartX - halfDartAmount;

  const dartRightX =
    dartX + halfDartAmount;

  // =======================================================
  // 結果
  // =======================================================

  return {

    dartX,
    dartTopY,

    dartLeftX,
    dartRightX,

    bustPointX: dartX,
    bustPointY: dartY,

    bustPoint,

    dartAmount:
      inputAmount
  };
}

  // =========================================================
  // ダーツ量変更
  // =========================================================

  function updateDartAmount() {
    if (!window.currentCalculation) {
      return;
    }

    const frontInput =
      document.getElementById("frontDartAmount");

    const backInput =
      document.getElementById("backDartAmount");

    if (!frontInput || !backInput) {
      return;
    }

    const frontAmount =
      Math.max(0, Number(frontInput.value) || 0);

    const backAmount =
      Math.max(0, Number(backInput.value) || 0);

    // 計算結果へ反映
    if (window.currentCalculation.front) {
      window.currentCalculation.front.dartAmount =
        frontAmount;
    }

    if (window.currentCalculation.back) {
      window.currentCalculation.back.dartAmount =
        backAmount;
    }

    // 型紙を再描画
    redrawPatternCurves();

    console.log(
      "ダーツ量を更新しました",
      "前身頃:",
      frontAmount,
      "後身頃:",
      backAmount
    );
  }

  // =========================================================
  // ダーツ入力監視
  // =========================================================

  document.addEventListener("input", (event) => {
    if (
      event.target &&
      (
        event.target.id === "frontDartAmount" ||
        event.target.id === "backDartAmount"
      )
    ) {
      updateDartAmount();
    }
  });
  
  // =========================================================
// A4分割印刷ページを作成
// =========================================================

function createA4PrintPages() {

  if (!canvas) {
    console.error("canvas が見つかりません");
    return false;
  }

  // -------------------------------------------------------
  // 既存の印刷コンテナを削除
  // -------------------------------------------------------

  const oldContainer =
    document.getElementById(
      "a4PrintContainer"
    );

  if (oldContainer) {
    oldContainer.remove();
  }

  // -------------------------------------------------------
  // 印刷コンテナ
  // -------------------------------------------------------

  const container =
    document.createElement("div");

  container.id =
    "a4PrintContainer";

  // -------------------------------------------------------
  // A4サイズ
  // -------------------------------------------------------

  const A4_WIDTH = 210;
  const A4_HEIGHT = 297;

  // 現在のキャンバスサイズ
  const canvasWidth = 700;
  const canvasHeight = 900;

  // -------------------------------------------------------
  // 必要枚数
  // -------------------------------------------------------

  const columns =
    Math.ceil(
      canvasWidth / A4_WIDTH
    );

  const rows =
    Math.ceil(
      canvasHeight / A4_HEIGHT
    );

  // -------------------------------------------------------
  // SVG名前空間
  // -------------------------------------------------------

  const SVG_NS =
    "http://www.w3.org/2000/svg";

  // -------------------------------------------------------
  // 各A4ページを作る
  // -------------------------------------------------------

  for (
    let row = 0;
    row < rows;
    row++
  ) {

    for (
      let col = 0;
      col < columns;
      col++
    ) {

      // -----------------------------------------------
      // ページ
      // -----------------------------------------------

      const page =
        document.createElement("div");

      page.className =
        "a4-print-page";

      // -----------------------------------------------
      // SVG
      // -----------------------------------------------

      const pageSvg =
        document.createElementNS(
          SVG_NS,
          "svg"
        );

      pageSvg.setAttribute(
        "width",
        "210mm"
      );

      pageSvg.setAttribute(
        "height",
        "297mm"
      );

      pageSvg.setAttribute(
        "viewBox",
        `0 0 ${A4_WIDTH} ${A4_HEIGHT}`
      );

      // -----------------------------------------------
      // 元のキャンバスから型紙をコピー
      // -----------------------------------------------

      const elements =
        canvas.querySelectorAll(
          "path, line, circle, text"
        );

      elements.forEach(
        (original) => {

          // A4ガイドはコピーしない
          if (
            original.closest(
              "#a4GuideLayer"
            )
          ) {
            return;
          }

          const clone =
            original.cloneNode(true);

          // ---------------------------------------------
          // 座標をA4ページ分だけ移動
          // ---------------------------------------------

          if (
            clone.hasAttribute("x")
          ) {

            clone.setAttribute(
              "x",
              Number(
                clone.getAttribute("x")
              ) -
              col * A4_WIDTH
            );
          }

          if (
            clone.hasAttribute("y")
          ) {

            clone.setAttribute(
              "y",
              Number(
                clone.getAttribute("y")
              ) -
              row * A4_HEIGHT
            );
          }

          if (
            clone.hasAttribute("x1")
          ) {

            clone.setAttribute(
              "x1",
              Number(
                clone.getAttribute("x1")
              ) -
              col * A4_WIDTH
            );

            clone.setAttribute(
              "y1",
              Number(
                clone.getAttribute("y1")
              ) -
              row * A4_HEIGHT
            );

            clone.setAttribute(
              "x2",
              Number(
                clone.getAttribute("x2")
              ) -
              col * A4_WIDTH
            );

            clone.setAttribute(
              "y2",
              Number(
                clone.getAttribute("y2")
              ) -
              row * A4_HEIGHT
            );
          }

          // ---------------------------------------------
          // パス
          // ---------------------------------------------

          if (
            clone.hasAttribute("d")
          ) {

            const d =
              clone.getAttribute("d");

            const translated =
              translateSvgPath(
                d,
                col * A4_WIDTH,
                row * A4_HEIGHT
              );

              // =========================================================
// SVGパスをA4ページ位置に合わせて移動
// =========================================================

function translateSvgPath(
  d,
  offsetX,
  offsetY
) {

  if (!d) {
    return d;
  }

  return d.replace(
    /([MLCQSTHVZ])|(-?\d+(?:\.\d+)?)/g,
    (match) => {

      // コマンド文字
      if (
        /[MLCQSTHVZ]/.test(match)
      ) {
        return match;
      }

      return match;
    }
  );
}

            clone.setAttribute(
              "d",
              translated
            );
          }

          if (
            clone.hasAttribute("cx")
          ) {

            clone.setAttribute(
              "cx",
              Number(
                clone.getAttribute("cx")
              ) -
              col * A4_WIDTH
            );

            clone.setAttribute(
              "cy",
              Number(
                clone.getAttribute("cy")
              ) -
              row * A4_HEIGHT
            );
          }

          pageSvg.appendChild(
            clone
          );
        }
      );

      // -----------------------------------------------
      // ページ番号
      // -----------------------------------------------

      const label =
        document.createElementNS(
          SVG_NS,
          "text"
        );

      label.setAttribute(
        "x",
        "5"
      );

      label.setAttribute(
        "y",
        "10"
      );

      label.setAttribute(
        "font-size",
        "5"
      );

      label.setAttribute(
        "fill",
        "black"
      );

      label.textContent =
        `Pattern Studio  A4 ${row * columns + col + 1}`;

      pageSvg.appendChild(
        label
      );

      page.appendChild(
        pageSvg
      );

      container.appendChild(
        page
      );
    }
  }

  document.body.appendChild(
    container
  );

  console.log(
    `A4印刷ページを${columns * rows}枚作成しました`
  );

  return true;
}

  // =========================================================
// A4分割プレビュー
// =========================================================

function showA4Preview() {

  if (!canvas) {
    console.error("canvas が見つかりません");
    return;
  }

  // =======================================================
  // 既存のA4ガイドを削除
  // =======================================================

  const oldGuide =
    canvas.querySelector("#a4GuideLayer");

  if (oldGuide) {
    oldGuide.remove();
  }

  // =======================================================
  // Pattern Studioの座標
  //
  // 1cm = 10px
  //
  // A4
  // 横 21cm  → 210px
  // 縦 29.7cm → 297px
  // =======================================================

  const A4_WIDTH = 210;
  const A4_HEIGHT = 297;

  // =======================================================
  // 現在のキャンバスサイズ
  // =======================================================

  const canvasWidth = 700;
  const canvasHeight = 900;

  // =======================================================
  // 必要なA4枚数
  // =======================================================

  const columns =
    Math.ceil(canvasWidth / A4_WIDTH);

  const rows =
    Math.ceil(canvasHeight / A4_HEIGHT);

  // =======================================================
  // A4ガイドレイヤー
  // =======================================================

  const guideLayer =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );

  guideLayer.setAttribute(
    "id",
    "a4GuideLayer"
  );

  // =======================================================
  // A4ページを作成
  // =======================================================

  for (let row = 0; row < rows; row++) {

    for (let col = 0; col < columns; col++) {

      const x =
        col * A4_WIDTH;

      const y =
        row * A4_HEIGHT;

      // ---------------------------------------------------
      // A4枠
      // ---------------------------------------------------

      const rect =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );

      rect.setAttribute(
        "x",
        x
      );

      rect.setAttribute(
        "y",
        y
      );

      rect.setAttribute(
        "width",
        A4_WIDTH
      );

      rect.setAttribute(
        "height",
        A4_HEIGHT
      );

      rect.setAttribute(
        "fill",
        "none"
      );

      rect.setAttribute(
        "stroke",
        "#1976d2"
      );

      rect.setAttribute(
        "stroke-width",
        "2"
      );

      rect.setAttribute(
        "stroke-dasharray",
        "8 5"
      );

      rect.setAttribute(
        "pointer-events",
        "none"
      );

      guideLayer.appendChild(rect);

      // ---------------------------------------------------
      // ページ番号
      // ---------------------------------------------------

      const pageNumber =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );

      pageNumber.setAttribute(
        "x",
        x + 8
      );

      pageNumber.setAttribute(
        "y",
        y + 15
      );

      pageNumber.setAttribute(
        "font-size",
        "10"
      );

      pageNumber.setAttribute(
        "font-family",
        "Arial, sans-serif"
      );

      pageNumber.setAttribute(
        "font-weight",
        "bold"
      );

      pageNumber.setAttribute(
        "fill",
        "#1976d2"
      );

      pageNumber.setAttribute(
        "pointer-events",
        "none"
      );

      pageNumber.textContent =
        `A4 ${row * columns + col + 1}`;

      guideLayer.appendChild(
        pageNumber
      );
    }
  }

  // =======================================================
  // 最前面に表示
  // =======================================================

  canvas.appendChild(
    guideLayer
  );

  console.log(
    "================================="
  );

  console.log(
    "A4分割プレビュー"
  );

  console.log(
    `横方向: ${columns}枚`
  );

  console.log(
    `縦方向: ${rows}枚`
  );

  console.log(
    `合計: ${columns * rows}枚`
  );

  console.log(
    "================================="
  );
}

// =========================================================
// A4分割プレビューボタン
// =========================================================

if (a4PreviewButton) {

  a4PreviewButton.addEventListener(
    "click",
    () => {

      if (
        !measurements ||
        !window.currentCalculation
      ) {

        alert(
          "先に型紙を作成してください。"
        );

        return;
      }

      showA4Preview();

    }
  );

}
// =========================================================
// 選択したパーツ全体に縫い代を付ける
// =========================================================

function addSeamAllowanceToSelectedPart() {

  if (!selectedPatternPart) {

    console.log(
      "縫い代を付けるパーツが選択されていません"
    );

    return;
  }

  // =========================================================
// パネル収納機能
// =========================================================

// ---------------------------------------------------------
// 左サイドバー
// ---------------------------------------------------------

 const sidebarToggleButton =
  document.getElementById("sidebarToggleButton");

if (sidebar && sidebarToggleButton) {

  sidebarToggleButton.addEventListener("click", () => {

    sidebar.classList.toggle("collapsed");

    if (sidebar.classList.contains("collapsed")) {

      sidebarToggleButton.textContent = "▶";

    } else {

      sidebarToggleButton.textContent = "◀";

    }

  });

}


// ---------------------------------------------------------
// 下部パネル
// ---------------------------------------------------------

const bottomPanel =
  document.getElementById("bottomPanel");

const bottomPanelToggle =
  document.getElementById("bottomPanelToggle");

if (bottomPanel && bottomPanelToggle) {

  bottomPanelToggle.addEventListener("click", () => {

    bottomPanel.classList.toggle("collapsed");

    if (bottomPanel.classList.contains("collapsed")) {

      bottomPanelToggle.textContent =
        "▲ パネルを表示";

    } else {

      bottomPanelToggle.textContent =
        "▼ パネルを収納";

    }

  });

}

  // -------------------------------------------------------
  // 縫い代幅
  // -------------------------------------------------------

  let allowance = 10;

  if (
    typeof seamAllowanceInput !== "undefined" &&
    seamAllowanceInput
  ) {

    const value =
      parseFloat(seamAllowanceInput.value);

    if (
      Number.isFinite(value) &&
      value >= 0
    ) {

      allowance = value * 10;

    }

  }

  console.log(
    "パーツ全体の縫い代を作成:",
    selectedPatternPart
  );

  console.log(
    "縫い代幅:",
    allowance,
    "SVG単位"
  );

  // -------------------------------------------------------
  // 選択パーツ内の線を取得
  // -------------------------------------------------------

  const lines =
    document.querySelectorAll(
      `[data-pattern-part="${selectedPatternPart}"]`
    );

  if (!lines.length) {

    console.warn(
      "選択パーツの線が見つかりません"
    );

    return;
  }

  // -------------------------------------------------------
  // 既存のパーツ縫い代を削除
  // -------------------------------------------------------

  document
    .querySelectorAll(
      `.part-seam-allowance[data-pattern-part="${selectedPatternPart}"]`
    )
    .forEach((element) => {

      element.remove();

    });

  // -------------------------------------------------------
  // 各線から縫い代線を作成
  // -------------------------------------------------------

  lines.forEach((element) => {

    if (
      element.classList.contains(
        "seam-allowance"
      )
    ) {
      return;
    }

    if (
      element.tagName !== "line" &&
      element.tagName !== "path"
    ) {
      return;
    }

    const seam =
      element.cloneNode(true);

    seam.classList.add(
      "part-seam-allowance"
    );

    seam.setAttribute(
      "data-pattern-part",
      selectedPatternPart
    );

    seam.setAttribute(
      "pointer-events",
      "none"
    );

    seam.style.pointerEvents =
      "none";

    // -----------------------------------------------------
    // 現段階では外側方向への基本オフセット
    // -----------------------------------------------------

    if (
      element.tagName === "line"
    ) {

      const x1 =
        parseFloat(element.getAttribute("x1"));

      const y1 =
        parseFloat(element.getAttribute("y1"));

      const x2 =
        parseFloat(element.getAttribute("x2"));

      const y2 =
        parseFloat(element.getAttribute("y2"));

      if (
        ![
          x1,
          y1,
          x2,
          y2
        ].every(Number.isFinite)
      ) {
        return;
      }

      const dx =
        x2 - x1;

      const dy =
        y2 - y1;

      const length =
        Math.sqrt(
          dx * dx +
          dy * dy
        );

      if (length === 0) {
        return;
      }

      const nx =
        -dy / length;

      const ny =
        dx / length;

      seam.setAttribute(
        "x1",
        x1 + nx * allowance
      );

      seam.setAttribute(
        "y1",
        y1 + ny * allowance
      );

      seam.setAttribute(
        "x2",
        x2 + nx * allowance
      );

      seam.setAttribute(
        "y2",
        y2 + ny * allowance
      );

    }

    // -----------------------------------------------------
    // 見た目
    // -----------------------------------------------------

    seam.setAttribute(
      "fill",
      "none"
    );

    seam.setAttribute(
      "stroke",
      "#e67e22"
    );

    seam.setAttribute(
      "stroke-width",
      "1.5"
    );

    seam.setAttribute(
      "stroke-dasharray",
      "6 4"
    );

    // -----------------------------------------------------
    // 元の線の直後に追加
    // -----------------------------------------------------

    if (element.parentNode) {

      element.parentNode.insertBefore(
        seam,
        element.nextSibling
      );

    }

  });

  console.log(
    "パーツ全体の縫い代を作成しました"
  );

}
// =========================================================
// 左サイドバー収納ボタン
// =========================================================

const sidebarEl = document.getElementById("sidebar");
const sidebarBtn = document.getElementById("sidebarToggleButton");

console.log("サイドバー:", sidebarEl);
console.log("収納ボタン:", sidebarBtn);

if (sidebarEl && sidebarBtn) {

  sidebarBtn.addEventListener("click", function () {

    console.log("収納ボタンが押されました");

    sidebarEl.classList.toggle("collapsed");

    if (sidebarEl.classList.contains("collapsed")) {

      sidebarBtn.textContent = "▶";

    } else {

      sidebarBtn.textContent = "◀";

    }

  });

}

// =========================================================
// 左サイドバー収納ボタン
// =========================================================

const sidebarToggleButtonFinal =
  document.getElementById("sidebarToggleButton");

const sidebarFinal =
  document.getElementById("sidebar");

if (sidebarToggleButtonFinal && sidebarFinal) {

  sidebarToggleButtonFinal.onclick = function () {

    sidebarFinal.classList.toggle("collapsed");

    if (sidebarFinal.classList.contains("collapsed")) {
      sidebarToggleButtonFinal.textContent = "▶";
    } else {
      sidebarToggleButtonFinal.textContent = "◀";
    }

  };

  // =========================================================
// 下部パネル収納
// =========================================================

const bottomPanel =
  document.getElementById("bottomPanel");

const bottomPanelToggle =
  document.getElementById("bottomPanelToggle");

if (bottomPanel && bottomPanelToggle) {

  bottomPanelToggle.addEventListener("click", () => {

    console.log("下部パネル収納ボタンが押されました");

    bottomPanel.classList.toggle("collapsed");

    if (bottomPanel.classList.contains("collapsed")) {

      bottomPanelToggle.textContent = "▲ パネルを表示";

    } else {

      bottomPanelToggle.textContent = "▼ パネルを収納";

    }

  });

}

}
// =========================================================
// スマホ用キャンバスタッチ操作
// =========================================================

const touchCanvasContainer =
  document.querySelector(".canvas-container");

let touchStartDistance = 0;
let touchStartZoom = 1;
let touchStartX = 0;
let touchStartY = 0;
let touchScrollLeft = 0;
let touchScrollTop = 0;

function getTouchDistance(touches) {

  const dx =
    touches[0].clientX - touches[1].clientX;

  const dy =
    touches[0].clientY - touches[1].clientY;

  return Math.sqrt(
    dx * dx + dy * dy
  );
}

if (touchCanvasContainer) {

  touchCanvasContainer.addEventListener(
    "touchstart",
    (event) => {

      /* 2本指 → ピンチズーム */

      if (event.touches.length === 2) {

        touchStartDistance =
          getTouchDistance(event.touches);

        touchStartZoom = zoomLevel;

        return;
      }


      /* 1本指 → キャンバス移動 */

      if (event.touches.length === 1) {

        touchStartX =
          event.touches[0].clientX;

        touchStartY =
          event.touches[0].clientY;

        touchScrollLeft =
          touchCanvasContainer.scrollLeft;

        touchScrollTop =
          touchCanvasContainer.scrollTop;
      }

    },
    { passive: false }
  );


  touchCanvasContainer.addEventListener(
    "touchmove",
    (event) => {

      event.preventDefault();


      /* =====================================
         2本指ズーム
      ===================================== */

      if (event.touches.length === 2) {

        const currentDistance =
          getTouchDistance(event.touches);

        if (!touchStartDistance) {
          return;
        }

        const ratio =
          currentDistance /
          touchStartDistance;

        let newZoom =
          touchStartZoom * ratio;

        newZoom =
          Math.max(
            0.5,
            Math.min(3, newZoom)
          );

        zoomLevel = newZoom;

        canvas.style.transform =
          `scale(${zoomLevel})`;

        if (resetZoomButton) {

          resetZoomButton.textContent =
            `${Math.round(zoomLevel * 100)}%`;

        }

        return;
      }


      /* =====================================
         1本指スクロール
      ===================================== */

      if (event.touches.length === 1) {

        const currentX =
          event.touches[0].clientX;

        const currentY =
          event.touches[0].clientY;

        const deltaX =
          touchStartX - currentX;

        const deltaY =
          touchStartY - currentY;

        touchCanvasContainer.scrollLeft =
          touchScrollLeft + deltaX;

        touchCanvasContainer.scrollTop =
          touchScrollTop + deltaY;
      }

    },
    { passive: false }
  );


  touchCanvasContainer.addEventListener(
    "touchend",
    () => {

      touchStartDistance = 0;

    }
  );

}
  // =========================================================
  // 初期化
  // =========================================================

  updateZoom();

  updateHistoryButtons();

console.log("Pattern Studio の初期化が完了しました");
});
