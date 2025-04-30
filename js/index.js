let oCol = 0
let oRow = 0
let renderTemp = []
let markArrX = []
let markArrY = []
let markArr = []

//创建表格
function renderTable() {
  if (document.getElementsByTagName('table') && document.getElementsByTagName('table').length) {
    document.getElementsByTagName('table')[0].remove()
  }

  let tableNode = document.createElement("table");
  let fragment = document.createDocumentFragment();
  renderTemp.forEach((tr, y) => {
    fragment.appendChild(createTRNode(tr, y))
  })
  tableNode.appendChild(fragment);
  document.getElementById('app').appendChild(tableNode)
}
//创建tr标签
function createTRNode(tds, y) {
  if (!Array.isArray(tds)) return
  let trNode = document.createElement("tr");
  tds.forEach((td, x) => {
    if (td !== undefined) {
      trNode.appendChild(createTDNode(td, x, y))
    }

  })
  return trNode
}

//创建td标签
function createTDNode(type, x, y) {
  let tdNode = document.createElement("td");
  tdNode.innerHTML = `${x}-${y}`
  tdNode.setAttribute('x', x)
  tdNode.setAttribute('y', y)
  if (type) {
    let [s, value1, value2] = type.split('-')
    if (s == 'cr') {
      tdNode.setAttribute('rowspan', value1)
      tdNode.setAttribute('colspan', value2)
    } else {
      tdNode.setAttribute(s, value1)
    }

  }

  tdNode.addEventListener('contextmenu', contextmenu)
  tdNode.addEventListener('click', function () {
    closeMenu()
  })
  return tdNode
}

//初始化表格
function initTable() {
  oCol = document.getElementById('col').value
  oRow = document.getElementById('row').value
  renderTemp = Array.from({ length: oCol }, () => new Array(Number(oRow)).fill(''));
  renderTable()
}

function submit() {
  initTable()
}

function contextmenu(event) {
  // 阻止默认的上下文菜单
  event.preventDefault();
  let x = Number(this.getAttribute('x'))
  let y = Number(this.getAttribute('y'))
  var customMenu = document.createElement('div');
  customMenu.className = 'box';
  customMenu.setAttribute('id', 'customMenu')
  customMenu.style.left = event.pageX + 'px';
  customMenu.style.top = event.pageY + 'px';

  console.log(Number(oRow), x)
  customMenu.innerHTML = `
      <div>
      跨行:
    <select id='selectCol'>
      ${new Array(Number(oRow) - x + 1).fill('').map((item, index) => {
    return `<option value='${index}'>${index}</option>`
  })}
    </select>
        </div>
    <div>跨列:
      <select id='selectRow'>
        ${new Array(Number(oCol) - y + 1).fill('').map((item, index) => {
    return `<option value='${index}'>${index}</option>`
  })}
      </select>
    </div>

    <div>
      跨行列:
    <select id='selectCol1'>
      ${new Array(Number(oRow) - x + 1).fill('').map((item, index) => {
    return `<option value='${index}'>${index}</option>`
  })}
    </select>
    <select id='selectRow2'>
      ${new Array(Number(oCol) - y + 1).fill('').map((item, index) => {
    return `<option value='${index}'>${index}</option>`
  })}
    </select>
        </div>
  `;

  document.body.appendChild(customMenu);


  document.getElementById('selectRow').addEventListener('change', (e) => { rowChange(e, x, y) })
  document.getElementById('selectCol').addEventListener('change', (e) => { colChange(e, x, y) })

  document.getElementById('selectRow2').addEventListener('change', (e) => { Row2Change(e, x, y) })

}
//跨行
function rowChange(e, x, y) {
  if (renderTemp[y][x].includes('colspan')) {
    renderTemp[y][x] = renderTemp[y][x] + '-1'
    let undefinedIndices = findUndefinedAfterColspan(renderTemp[y], renderTemp[y][x]);
    renderTemp[y][x] = ''
    undefinedIndices.forEach(index => {
      renderTemp[y][index] = ''
    })
  }

  if (renderTemp[y][x].includes('rowspan')) {
    renderTemp.forEach(tr => {
      tr[x] = ''
    })
  }

  if (renderTemp[y][x].includes('cr')) {
    let undefinedIndices = findUndefinedInRange(renderTemp, renderTemp[y][x])
    undefinedIndices.forEach(el => {
      renderTemp[el[0]][el[1]] = ''
    })
    renderTemp.forEach(tr => {
      tr[x] = ''
    })
  }
  markArrX = []
  let value = e.target.value
  renderTemp[y][x] = `rowspan-${value}`
  for (let i = 0; i < value - 1; i++) {
    markArrX.push(`${y + i + 1}-${x}`)
  }
  markArrX.forEach(posStr => {
    removePositionY(renderTemp, posStr)
  })

  renderTable()
  closeMenu()
}
//跨列
function colChange(e, x, y) {

  if (renderTemp[y][x].includes('rowspan')) {
    let undefinedIndices = findUndefinedAfterRowspan(renderTemp, renderTemp[y][x])
    undefinedIndices.forEach(el => {
      renderTemp[el[0]][el[1]] = ''
    })
  }

  if (renderTemp[y][x].includes('colspan')) {
    renderTemp[y].forEach((el, index) => {
      if (el == undefined) {
        renderTemp[y][index] = ''
      }
    })
  }

  if (renderTemp[y][x].includes('cr')) {
    let undefinedIndices = findUndefinedInRange(renderTemp, renderTemp[y][x])
    undefinedIndices.forEach(el => {
      renderTemp[el[0]][el[1]] = ''
    })
    renderTemp[y].forEach((el, index) => {
      if (el == undefined) {
        renderTemp[y][index] = ''
      }
    })
  }


  markArrY = []
  let value = e.target.value
  renderTemp[y][x] = `colspan-${value}`
  for (let i = 0; i < value - 1; i++) {
    markArrY.push(`${x + i + 1}-${y}`)
  }


  markArrY.forEach(posStr => {
    console.log(posStr)
    removePositionX(renderTemp, posStr)
  })


  renderTable()
  closeMenu()
}


function Row2Change(e, x, y) {
  let value1 = e.target.value
  let value2 = document.getElementById('selectCol1').value //列val

  if (!value1 && !value2) return

  if (renderTemp[y][x].includes('rowspan')) {
    let undefinedIndices = findUndefinedAfterRowspan(renderTemp, renderTemp[y][x])
    undefinedIndices.forEach(el => {
      renderTemp[el[0]][el[1]] = ''
    })
  }

  if (renderTemp[y][x].includes('colspan')) {
    renderTemp[y].forEach((el, index) => {
      if (el == undefined) {
        renderTemp[y][index] = ''
      }
    })
  }

  if (renderTemp[y][x].includes('cr')) {
    let undefinedIndices = findUndefinedInRange(renderTemp, renderTemp[y][x])
    undefinedIndices.forEach(el => {
      renderTemp[el[0]][el[1]] = ''
    })
  }
  markArrY = []
  markArrX = []
  markArr = []
  renderTemp[y][x] = `cr-${value1}-${value2}`
  for (let i = 0; i < value2 - 1; i++) {
    markArrX.push(`${x + i + 1}-${y}`)
  }
  for (let i = 0; i < value1 - 1; i++) {
    markArrY.push(`${y + i + 1}-${x}`)
  }

  markArrX.forEach((el => {
    let [xx, j] = el.split('-')
    for (let i = 0; i < value1; i++) {
      markArr.push(`${Number(xx - 1) + 1}-${y + i}`)
    }
  }))


  markArr.forEach(posStr => {
    removePositionX(renderTemp, posStr)
  })
  markArrY.forEach(posStr => {
    removePositionY(renderTemp, posStr)
  })

  console.log(renderTemp)

  renderTable()
  closeMenu()


}

function closeMenu() {
  document.body.removeChild(document.getElementById('customMenu'));
}

function removePositionX(arr, posStr) {
  // 解析输入的字符串得到行和列的索引

  let [rowIndex, colIndex] = posStr.split('-').map(Number);
  // 检查行列索引是否在数组范围内
  // if (rowIndex < 0 || rowIndex >= arr.length || colIndex < 0 || colIndex >= arr[rowIndex].length) {
  //   console.log(`位置 ${posStr} 超出数组范围`);
  //   return false;
  // }
  // 删除对应位置的元素，这里我们简单地将其设置为 undefined 或者你想要的默认值
  arr[colIndex][rowIndex] = undefined;
  return arr;
}

function removePositionY(arr, posStr) {
  // 解析输入的字符串得到行和列的索引
  let [rowIndex, colIndex] = posStr.split('-').map(Number);
  // 检查行列索引是否在数组范围内
  if (rowIndex < 0 || rowIndex >= arr.length || colIndex < 0 || colIndex >= arr[rowIndex].length) {
    console.log(`位置 ${posStr} 超出数组范围`);
    return false;
  }
  // 删除对应位置的元素，这里我们简单地将其设置为 undefined 或者你想要的默认值
  arr[rowIndex][colIndex] = undefined;
  return arr;
}


function findUndefinedAfterColspan(arr, target) {
  let indices = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) {
      // 检查target之后的元素是否为placeholder，并记录它们的索引
      let j = i + 1;
      while (j < arr.length && arr[j] === undefined) {
        indices.push(j);
        j++;
      }
    }
  }
  return indices;
}

function findUndefinedAfterRowspan(arr, target) {
  let indices = [];

  for (let rowIndex = 0; rowIndex < arr.length; rowIndex++) {
    const row = arr[rowIndex];

    // 查找当前行中所有的target及其索引
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      if (row[colIndex] === target) {
        // 检查下一行相同列位置是否为undefined
        if ((rowIndex + 1) < arr.length && arr[rowIndex + 1][colIndex] === undefined) {
          indices.push([rowIndex + 1, colIndex]);
        }
        // 如果rowspan值大于2，继续检查再下一行
        let rowspanCount = parseInt(target.split('-')[1], 10);
        for (let i = 1; i < rowspanCount; i++) {
          let nextRowIndex = rowIndex + i + 1;
          if (nextRowIndex < arr.length && arr[nextRowIndex][colIndex] === undefined) {
            indices.push([nextRowIndex, colIndex]);
          } else {
            break;
          }
        }
      }
    }
  }

  return indices;
}


function findUndefinedInRange(arr, target) {
  let indices = [];

  for (let rowIndex = 0; rowIndex < arr.length; rowIndex++) {
    const row = arr[rowIndex];

    // 查找当前行中所有的target及其索引
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      if (row[colIndex] === target) {
        // 解析出rowspan和colspan
        const [_, rowspan, colspan] = target.match(/cr-(\d+)-(\d+)/).map(Number);

        // 遍历rowspan范围内的所有行
        for (let r = 0; r < rowspan; r++) {
          const nextRowIndex = rowIndex + r;

          // 如果超出数组边界则跳出循环
          if (nextRowIndex >= arr.length) break;

          // 遍历colspan范围内的所有列
          for (let c = 0; c < colspan; c++) {
            const nextColIndex = colIndex + c;

            // 如果超出数组边界则跳出循环
            if (nextColIndex >= arr[nextRowIndex].length) break;

            // 检查该位置是否为undefined
            if (arr[nextRowIndex][nextColIndex] === undefined) {
              indices.push([nextRowIndex, nextColIndex]);
            }
          }
        }
      }
    }
  }
  return indices;
}

function generateHTMLAndDownload() {
  let tableHTML = document.getElementById('app').innerHTML
  // 定义HTML内容
  const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <title>表格</title>
          <style>
            table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    border: 1px solid rgb(129, 129, 129);
    border-collapse: collapse;
  }  
          </style>
      </head>
      <body>
          ${tableHTML}
      </body>
      </html>
  `;
  // 创建一个Blob对象，包含HTML内容
  const blob = new Blob([htmlContent], { type: 'text/html' });

  // 创建一个指向该Blob的URL
  const url = URL.createObjectURL(blob);

  // 创建一个a标签并模拟点击以触发下载
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample.html'; // 设置下载文件的名称
  document.body.appendChild(a);
  a.click();
  // 清理，移除创建的a标签和释放URL对象
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100); // 延迟释放URL对象，确保下载完成
}