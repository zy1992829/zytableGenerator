// 状态变量
let oCol = 0;
let oRow = 0;
let renderTemp = [];
const MERGED = 'MERGED'; // 专用标记，表示该单元格被合并占用

// 初始化表格
function initTable() {
  const col = Math.max(1, Math.min(20, parseInt(document.getElementById('col').value) || 4));
  const row = Math.max(1, Math.min(20, parseInt(document.getElementById('row').value) || 4));

  // 初始化：每个单元格都是空字符串 ''
  renderTemp = Array.from({ length: row }, () => new Array(col).fill(''));
  oRow = row;
  oCol = col;

  renderTable();
}

function submit() {
  initTable();
}

// 渲染表格
function renderTable() {
  const tableExist = document.getElementsByTagName('table');
  if (tableExist.length) tableExist[0].remove();

  const tableNode = document.createElement("table");
  const fragment = document.createDocumentFragment();

  renderTemp.forEach((tr, y) => {
    fragment.appendChild(createTRNode(tr, y));
  });

  tableNode.appendChild(fragment);
  document.getElementById('app').appendChild(tableNode);
}

function createTRNode(tds, y) {
  const trNode = document.createElement("tr");
  // 遍历每一列
  for (let x = 0; x < oCol; x++) {
    const cellValue = tds[x];
    // 只有不是 MERGED 的单元格才渲染
    if (cellValue !== MERGED) {
      trNode.appendChild(createTDNode(cellValue, x, y));
    }
  }
  return trNode;
}

function getValue(x, y) {
  const val = renderTemp[y]?.[x];
  if (typeof val === 'string' && val.includes('|')) {
    return val.split('|').slice(-1)[0];
  }
  return val || '';
}

function createTDNode(cellValue, x, y) {
  const tdNode = document.createElement("td");

  // 默认值
  let displayText = '';
  let rowspan = 1;
  let colspan = 1;
  let styleObj = null;

  if (typeof cellValue === 'string' && cellValue.trim() !== '') {
    const parts = cellValue.split('|').filter(p => p !== '');

    for (const part of parts) {
      // 解析跨行
      if (part.startsWith('rowspan-')) {
        const r = parseInt(part.split('-')[1]);
        if (r > 1) rowspan = r;
      }
      // 解析跨列
      else if (part.startsWith('colspan-')) {
        const c = parseInt(part.split('-')[1]);
        if (c > 1) colspan = c;
      }
      // 解析跨行列
      else if (part.startsWith('cr-')) {
        const match = part.match(/cr-(\d+)-(\d+)/);
        if (match) {
          const r = parseInt(match[1]);
          const c = parseInt(match[2]);
          if (r > 1) rowspan = r;
          if (c > 1) colspan = c;
        }
      }
      // 解析样式
      else if (part.startsWith('style-')) {
        try {
          const encoded = part.slice(6); // 去掉 'style-'
          const decoded = JSON.parse(atob(unescape(encodeURIComponent(encoded))));
          styleObj = decoded;
        } catch (e) {
          console.warn('样式解析失败', e);
        }
      }
      // 其他部分认为是文本（避免结构标记被当作文本）
      else if (!part.startsWith('rowspan-') &&
        !part.startsWith('colspan-') &&
        !part.startsWith('cr-') &&
        !part.startsWith('style-')) {
        displayText = part;
      }
    }

    // 如果没提取到文本，尝试从最后一个 | 后取
    if (!displayText && cellValue.includes('|')) {
      const lastPipeIndex = cellValue.lastIndexOf('|');
      const lastPart = cellValue.substring(lastPipeIndex + 1);
      if (lastPart &&
        !lastPart.startsWith('rowspan-') &&
        !lastPart.startsWith('colspan-') &&
        !lastPart.startsWith('cr-') &&
        !lastPart.startsWith('style-')) {
        displayText = lastPart;
      }
    }
  } else if (cellValue !== null && cellValue !== undefined) {
    displayText = String(cellValue);
  }

  tdNode.textContent = displayText;
  tdNode.setAttribute('x', x);
  tdNode.setAttribute('y', y);

  // 设置合并属性
  if (rowspan > 1) tdNode.setAttribute('rowspan', rowspan);
  if (colspan > 1) tdNode.setAttribute('colspan', colspan);

  // 应用样式
  if (styleObj) {
    if (styleObj.font) tdNode.style.fontFamily = styleObj.font;
    if (styleObj.size) tdNode.style.fontSize = styleObj.size + 'px';
    if (styleObj.color) tdNode.style.color = styleObj.color;
    if (styleObj.bold) tdNode.style.fontWeight = 'bold';
    if (styleObj.italic) tdNode.style.fontStyle = 'italic';
    if (styleObj.underline) tdNode.style.textDecoration = 'underline';
    if (styleObj.textAlign) tdNode.style.textAlign = styleObj.textAlign;
    if (styleObj.verticalAlign) tdNode.style.verticalAlign = styleObj.verticalAlign;
  }

  // 事件绑定
  tdNode.addEventListener('contextmenu', function (e) {
    contextmenu.call(this, e, x, y);
  });
  tdNode.addEventListener('click', closeMenu);
  tdNode.addEventListener('dblclick', onDblClick);
  tdNode.addEventListener('blur', onCellBlur, true);
  tdNode.addEventListener('keydown', onCellKeydown);

  return tdNode;
}

function onDblClick(e) {
  const cell = e.target;
  cell.setAttribute('contenteditable', 'true');
  cell.focus();
  cell.dataset.previousContent = cell.textContent;
}

function onCellBlur(e) {
  const cell = e.target;
  const x = Number(cell.getAttribute('x'));
  const y = Number(cell.getAttribute('y'));
  const newText = cell.textContent.trim();

  // 获取当前单元格的原始值
  const current = renderTemp[y][x];

  if (typeof current === 'string') {
    // 如果是合并单元格，保留合并标记
    if (current.startsWith('style-') && current.includes('|')) {
      const stylePart = current.split('|')[0] + '|'; // 保留 style-xxx|
      renderTemp[y][x] = stylePart + newText;
    }
    if (current.startsWith('rowspan-')) {
      const r = current.split('-')[1].split('|')[0];
      renderTemp[y][x] = `rowspan-${r}${newText ? '|' + newText : ''}`;
    } else if (current.startsWith('colspan-')) {
      const c = current.split('-')[1].split('|')[0];
      renderTemp[y][x] = `colspan-${c}${newText ? '|' + newText : ''}`;
    } else if (current.startsWith('cr-')) {
      const match = current.match(/cr-(\d+)-(\d+)/);
      if (match) {
        const r = match[1], c = match[2];
        renderTemp[y][x] = `cr-${r}-${c}${newText ? '|' + newText : ''}`;
      }
    } else {
      // 普通单元格
      renderTemp[y][x] = newText;
    }
  } else {
    renderTemp[y][x] = newText;
  }

  cell.removeAttribute('contenteditable');
}

function onCellKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    e.target.blur();
  }
}

// 右键菜单
function contextmenu(e, x, y) {
  e.preventDefault();
  closeMenu();

  const maxRowspan = oRow - y;
  const maxColspan = oCol - x;

  const customMenu = document.createElement('div');
  customMenu.className = 'box';
  customMenu.id = 'customMenu';
  customMenu.style.left = e.pageX + 'px';
  customMenu.style.top = e.pageY + 'px';

  // 使用内联样式，避免换行问题
  customMenu.innerHTML = `
 <div>跨行:
   <select id="selectRowspan">
     ${Array.from({ length: maxRowspan + 1 }, (_, i) =>
    `<option value="${i}" ${i === 1 ? 'selected' : ''}>${i}</option>`
  ).join('')}
   </select>
 </div>
 <div>跨列:
   <select id="selectColspan">
     ${Array.from({ length: maxColspan + 1 }, (_, i) =>
    `<option value="${i}" ${i === 1 ? 'selected' : ''}>${i}</option>`
  ).join('')}
   </select>
 </div>
 <div>跨行列:
   <select id="selectRowspan2">
     ${Array.from({ length: maxRowspan + 1 }, (_, i) =>
    `<option value="${i}" ${i === 1 ? 'selected' : ''}>${i}</option>`
  ).join('')}
   </select>
   <select id="selectColspan2">
     ${Array.from({ length: maxColspan + 1 }, (_, i) =>
    `<option value="${i}" ${i === 1 ? 'selected' : ''}>${i}</option>`
  ).join('')}
   </select>
 </div>
 <div id="fontStyleToggle" style="cursor:pointer;padding:4px 0;color:#007cba;">
   🎨 设置字体样式...
 </div>
 <div id="fontStylePanel" style="display:none;margin-top:5px;padding:5px;background:#f9f9f9;border:1px solid #ddd;border-radius:3px;font-size:12px;">
   <div>字体:
     <select id="fontFamily" style="width:100%;font-size:12px;">
       <option value="Arial">Arial</option>
       <option value="Verdana">Verdana</option>
       <option value="Helvetica">Helvetica</option>
       <option value="Times New Roman">Times New Roman</option>
       <option value="Georgia">Georgia</option>
       <option value="Courier New">Courier New</option>
       <option value="SimSun">宋体</option>
       <option value="Microsoft YaHei">微软雅黑</option>
       <option value="KaiTi">楷体</option>
     </select>
   </div>
   <div>大小:
     <input type="number" id="fontSize" value="14" min="8" max="72" style="width:100%;padding:1px;font-size:12px;"/>
   </div>
   <div>颜色:
     <input type="color" id="fontColor" value="#000000" style="width:30px;height:20px;vertical-align:middle;"/>
     <input type="text" id="fontColorText" value="#000000" style="width:60px;font-size:12px;"/>
   </div>
   <label><input type="checkbox" id="fontBold"/> 加粗</label>
   <label><input type="checkbox" id="fontItalic"/> 斜体</label>
   <label><input type="checkbox" id="fontUnderline"/> 下划线</label>
   <div>对齐:
     <select id="textAlign" style="width:100%;font-size:12px;">
       <option value="left">居左</option>
       <option value="center">居中</option>
       <option value="right">居右</option>
     </select>
   </div>
   <div id="saveFontStyle" style="margin-top:5px;background:#007cba;color:white;text-align:center;padding:3px 0;cursor:pointer;border-radius:2px;font-size:13px;">
     ✅ 保存
   </div>
 </div>
`;

  document.body.appendChild(customMenu);

  // 使用 customMenu 自身的 querySelector 查找子元素
  customMenu.querySelector('#selectRowspan').addEventListener('change', (event) => {
    rowChange(event, x, y);
  });
  customMenu.querySelector('#selectColspan').addEventListener('change', (event) => {
    colChange(event, x, y);
  });
  customMenu.querySelector('#selectColspan2').addEventListener('change', (event) => {
    crChange(event, x, y);
  });

  // === 字体样式面板交互 ===
  const toggle = customMenu.querySelector('#fontStyleToggle');
  const panel = customMenu.querySelector('#fontStylePanel');

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();

    if (panel.style.display === 'none') {
      // === 修复：支持 colspan|style|text 格式 ===
      const cellValue = renderTemp[y][x];
      let currentStyle = {
        font: 'Arial',
        size: 14,
        color: '#000000',
        bold: false,
        italic: false,
        underline: false,
        textAlign: 'left'
      };

      if (typeof cellValue === 'string') {
        // 提取所有 | 分隔的部分
        const parts = cellValue.split('|');
        let stylePart = null;

        for (const part of parts) {
          if (part.startsWith('style-')) {
            stylePart = part.slice(6); // 去掉 'style-'
            break;
          }
        }

        if (stylePart) {
          try {
            //  必须 reverse unescape(encodeURIComponent(...))
            const decodedJson = decodeURIComponent(escape(atob(stylePart)));
            currentStyle = JSON.parse(decodedJson);
          } catch (e) {
            console.warn('样式解析失败', e);
          }
        }
      }

      // 回填到表单控件
      customMenu.querySelector('#fontFamily').value = currentStyle.font || 'Arial';
      customMenu.querySelector('#fontSize').value = currentStyle.size || 14;
      customMenu.querySelector('#fontColor').value = currentStyle.color || '#000000';
      customMenu.querySelector('#fontColorText').value = currentStyle.color || '#000000';
      customMenu.querySelector('#fontBold').checked = !!currentStyle.bold;
      customMenu.querySelector('#fontItalic').checked = !!currentStyle.italic;
      customMenu.querySelector('#fontUnderline').checked = !!currentStyle.underline;
      customMenu.querySelector('#textAlign').value = currentStyle.textAlign || 'left';
    }

    // 切换显示状态
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  // 颜色输入框同步
  customMenu.querySelector('#fontColor').addEventListener('input', (e) => {
    customMenu.querySelector('#fontColorText').value = e.target.value;
  });
  customMenu.querySelector('#fontColorText').addEventListener('input', (e) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
      customMenu.querySelector('#fontColor').value = e.target.value;
    }
  });

  // 保存字体样式（修复：保留 colspan/rowspan）
  customMenu.querySelector('#saveFontStyle').addEventListener('click', (e) => {
    e.stopPropagation();

    const newStyle = {
      font: customMenu.querySelector('#fontFamily').value,
      size: parseInt(customMenu.querySelector('#fontSize').value) || 14,
      color: customMenu.querySelector('#fontColor').value,
      bold: customMenu.querySelector('#fontBold').checked,
      italic: customMenu.querySelector('#fontItalic').checked,
      underline: customMenu.querySelector('#fontUnderline').checked,
      textAlign: customMenu.querySelector('#textAlign').value
    };

    const encodedStyle = btoa(unescape(encodeURIComponent(JSON.stringify(newStyle))));

    // 解析原值：提取结构 + 文本
    const rawValue = renderTemp[y][x];
    let structurePart = ''; // 保存 rowspan-/colspan-/cr-
    let textContent = '';

    if (typeof rawValue === 'string') {
      const parts = rawValue.split('|');

      // 收集所有结构标记（rowspan-/colspan-/cr-）
      structurePart = parts
        .filter(part =>
          part.startsWith('rowspan-') ||
          part.startsWith('colspan-') ||
          part.startsWith('cr-')
        )
        .join('|');

      // 取最后一个 | 后的内容作为文本（最可能是纯文本）
      const lastPart = parts[parts.length - 1];
      if (lastPart && !lastPart.startsWith('style-') &&
        !lastPart.startsWith('rowspan-') &&
        !lastPart.startsWith('colspan-') &&
        !lastPart.startsWith('cr-')) {
        textContent = lastPart;
      } else {
        // 如果没有显式文本，尝试从非结构部分找
        const textCandidates = parts.filter(p =>
          !p.startsWith('rowspan-') &&
          !p.startsWith('colspan-') &&
          !p.startsWith('cr-') &&
          !p.startsWith('style-')
        );
        textContent = textCandidates.join('') || '';
      }
    } else {
      textContent = String(rawValue || '');
    }

    let newValue = '';
    if (structurePart) {
      newValue += structurePart + '|';
    }
    newValue += `style-${encodedStyle}|${textContent}`;
    renderTemp[y][x] = newValue;
    renderTable();
    closeMenu();
  });
}
// 检查从 (startX, startY) 开始，跨 r 行 c 列的区域
// 是否与已有合并单元格冲突，并清除被覆盖的合并
function clearOverlappingSpans(startX, startY, r, c) {
  const endX = startX + c;
  const endY = startY + r;

  for (let y = 0; y < oRow; y++) {
    for (let x = 0; x < oCol; x++) {
      const cell = renderTemp[y][x];
      if (typeof cell === 'string') {
        let cr, rr, cc;

        if (cell.startsWith('rowspan-')) {
          rr = parseInt(cell.split('-')[1]);
          cc = 1;
        } else if (cell.startsWith('colspan-')) {
          rr = 1;
          cc = parseInt(cell.split('-')[1]);
        } else if (cell.startsWith('cr-')) {
          const match = cell.match(/cr-(\d+)-(\d+)/);
          rr = parseInt(match[1]);
          cc = parseInt(match[2]);
        } else {
          continue; // 普通文本，不处理
        }
        const cellEndY = y + rr;
        const cellEndX = x + cc;
        // 检查两个矩形是否重叠
        if (
          startX < cellEndX &&
          endX > x &&
          startY < cellEndY &&
          endY > y
        ) {
          // 重叠！清除这个合并
          clearCellSpan(y, x);
        }
      }
    }
  }
}
// 清除旧的合并状态
function clearCellSpan(y, x) {
  const cell = renderTemp[y][x];
  if (typeof cell !== 'string') return;

  if (cell.startsWith('rowspan-')) {
    const r = parseInt(cell.split('-')[1]);
    for (let i = 1; i < r; i++) {
      if (y + i < oRow) renderTemp[y + i][x] = ''; // 恢复为空
    }
  }
  if (cell.startsWith('colspan-')) {
    const c = parseInt(cell.split('-')[1]);
    for (let i = 1; i < c; i++) {
      if (x + i < oCol) renderTemp[y][x + i] = '';
    }
  }
  if (cell.startsWith('cr-')) {
    const match = cell.match(/cr-(\d+)-(\d+)/);
    if (match) {
      const r = parseInt(match[1]), c = parseInt(match[2]);
      for (let i = 0; i < r; i++) {
        for (let j = 0; j < c; j++) {
          if (i > 0 || j > 0) {
            if (y + i < oRow && x + j < oCol) {
              renderTemp[y + i][x + j] = '';
            }
          }
        }
      }
    }
  }
  // 最后把自己恢复为普通内容（保留文本）
  if (cell.includes('|')) {
    renderTemp[y][x] = cell.split('|')[1] || '';
  } else {
    renderTemp[y][x] = '';
  }
}

// 跨行
function rowChange(e, x, y) {
  const r = Number(e.target.value);
  clearCellSpan(y, x);

  clearOverlappingSpans(x, y, r, 1);

  if (r <= 1) {
    // 取消合并
    const text = typeof renderTemp[y][x] === 'string' && renderTemp[y][x].includes('|')
      ? renderTemp[y][x].split('|')[1] || ''
      : '';
    renderTemp[y][x] = text;
  } else if (y + r <= oRow) {
    const text = typeof renderTemp[y][x] === 'string' && renderTemp[y][x].includes('|')
      ? renderTemp[y][x].split('|')[1] || ''
      : '';
    renderTemp[y][x] = `rowspan-${r}${text ? '|' + text : ''}`;
    // 设置被合并的单元格为 MERGED
    for (let i = 1; i < r; i++) {
      renderTemp[y + i][x] = MERGED;
    }
  }
  renderTable();
  closeMenu();
}

// 跨列
function colChange(e, x, y) {
  const c = Number(e.target.value);
  clearCellSpan(y, x);
  clearOverlappingSpans(x, y, 1, c);
  if (c <= 1) {
    const text = typeof renderTemp[y][x] === 'string' && renderTemp[y][x].includes('|')
      ? renderTemp[y][x].split('|')[1] || ''
      : '';
    renderTemp[y][x] = text;
  } else if (x + c <= oCol) {
    const text = typeof renderTemp[y][x] === 'string' && renderTemp[y][x].includes('|')
      ? renderTemp[y][x].split('|')[1] || ''
      : '';
    renderTemp[y][x] = `colspan-${c}${text ? '|' + text : ''}`;
    for (let i = 1; i < c; i++) {
      renderTemp[y][x + i] = MERGED;
    }
  }
  renderTable();
  closeMenu();
}

// 跨行列
function crChange(e, x, y) {
  const r = Number(document.getElementById('selectRowspan2').value);
  const c = Number(document.getElementById('selectColspan2').value);
  if (!r || !c) return;
  // 第一步：清除该位置原有的合并
  clearCellSpan(y, x);
  // 第二步：清除所有与新区域重叠的其他合并
  clearOverlappingSpans(x, y, r, c);

  if (r <= 1 && c <= 1) {
    const text = typeof renderTemp[y][x] === 'string' && renderTemp[y][x].includes('|')
      ? renderTemp[y][x].split('|')[1] || ''
      : '';
    renderTemp[y][x] = text;
  } else if (y + r <= oRow && x + c <= oCol) {
    const text = typeof renderTemp[y][x] === 'string' && renderTemp[y][x].includes('|')
      ? renderTemp[y][x].split('|')[1] || ''
      : '';
    renderTemp[y][x] = `cr-${r}-${c}${text ? '|' + text : ''}`;
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        if (i === 0 && j === 0) continue;
        renderTemp[y + i][x + j] = MERGED;
      }
    }
  }
  renderTable();
  closeMenu();
}

// 关闭菜单
function closeMenu() {
  const menu = document.getElementById('customMenu');
  if (menu) document.body.removeChild(menu);
}

// ========================
// 新增：导出HTML功能
// ========================

function exportHTML() {
  const container = document.getElementById('exportContainer');
  const preview = document.getElementById('exportPreview');

  // 生成HTML字符串
  const html = generateTableHTML();
  preview.textContent = html;

  container.style.display = 'block';
}

function generateTableHTML() {
  let html = '<table border="1" cellspacing="0" cellpadding="5" style="border-collapse: collapse;">\n';

  for (let y = 0; y < oRow; y++) {
    const row = renderTemp[y];
    let rowHtml = '  <tr>\n';

    for (let x = 0; x < oCol; x++) {
      const cellValue = row[x];
      if (cellValue === MERGED) continue; // 跳过被合并的占位格

      let rowspan = 1;
      let colspan = 1;
      let styleCSS = '';
      let text = '';

      if (typeof cellValue === 'string') {
        const parts = cellValue.split('|').filter(p => p !== '');

        for (const part of parts) {
          // 解析 rowspan
          if (part.startsWith('rowspan-')) {
            const r = parseInt(part.split('-')[1]);
            if (r > 1) rowspan = r;
          }
          // 解析 colspan
          else if (part.startsWith('colspan-')) {
            const c = parseInt(part.split('-')[1]);
            if (c > 1) colspan = c;
          }
          // 解析 cr- (跨行列)
          else if (part.startsWith('cr-')) {
            const match = part.match(/cr-(\d+)-(\d+)/);
            if (match) {
              const r = parseInt(match[1]);
              const c = parseInt(match[2]);
              if (r > 1) rowspan = r;
              if (c > 1) colspan = c;
            }
          }
          //解析 style-
          else if (part.startsWith('style-')) {
            const styleStr = part.slice(6); // 去掉 'style-'
            try {
              const decodedStyle = JSON.parse(atob(unescape(encodeURIComponent(styleStr))));
              if (decodedStyle.font) styleCSS += `font-family:${decodedStyle.font};`;
              if (decodedStyle.size) styleCSS += `font-size:${decodedStyle.size}px;`;
              if (decodedStyle.color) styleCSS += `color:${decodedStyle.color};`;
              if (decodedStyle.bold) styleCSS += `font-weight:bold;`;
              if (decodedStyle.italic) styleCSS += `font-style:italic;`;
              if (decodedStyle.underline) styleCSS += `text-decoration:underline;`;
              if (decodedStyle.textAlign) styleCSS += `text-align:${decodedStyle.textAlign};`;
            } catch (e) {
              console.warn('样式解析失败', e);
            }
          }
          //其他部分认为是文本（避免结构标记被当作文本）
          else if (!part.startsWith('rowspan-') &&
            !part.startsWith('colspan-') &&
            !part.startsWith('cr-') &&
            !part.startsWith('style-')) {
            text = part;
          }
        }

        // 如果还没提取到文本，尝试从最后一个 | 后取
        if (!text && cellValue.includes('|')) {
          const lastPipeIndex = cellValue.lastIndexOf('|');
          const lastPart = cellValue.substring(lastPipeIndex + 1);
          if (lastPart &&
            !lastPart.startsWith('rowspan-') &&
            !lastPart.startsWith('colspan-') &&
            !lastPart.startsWith('cr-') &&
            !lastPart.startsWith('style-')) {
            text = lastPart;
          }
        }
      } else {
        text = String(cellValue || '');
      }
      const styleAttr = styleCSS ? ` style="${styleCSS}"` : '';
      const rowspanAttr = rowspan > 1 ? ` rowspan="${rowspan}"` : '';
      const colspanAttr = colspan > 1 ? ` colspan="${colspan}"` : '';
      const finalText = text;
      rowHtml += `    <td${rowspanAttr}${colspanAttr}${styleAttr}>${finalText}</td>\n`;
    }

    rowHtml += '  </tr>';
    html += rowHtml + '\n';
  }

  html += '</table>';
  return html;
}

function downloadHTML() {
  const html = generateTableHTML();
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `table_export_${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function closeExport() {
  document.getElementById('exportContainer').style.display = 'none';
}

// 页面加载后初始化
window.addEventListener('load', () => {
  initTable();
});