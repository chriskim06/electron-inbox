const electron = require('electron')
const {app, BrowserWindow, Menu, globalShortcut, ipcMain, shell} = electron

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

// This method creates the browser window that loads inbox and executes javascript
// that will create notifications when new emails arrive.
const createWindow = () => {
  const display = electron.screen.getPrimaryDisplay().workArea
  mainWindow = new BrowserWindow({
    width: display.width,
    height: display.height,
    webPreferences: {
      webaudio: false
    }
  })

  mainWindow.loadURL('https://inbox.google.com/')

  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.executeJavaScript(`
      (() => {
        if (Notification.permission === 'granted') {
          let nav = document.getElementsByClassName('bl')
          let unread = document.getElementsByClassName('ss')
          let bundles = document.getElementsByClassName('rO HB')
          let ipcRenderer = require('electron').ipcRenderer
          let badgeCount = 0
          let re = /(\d+) new/
          setInterval(() => {
            if (nav.length && nav[0].title === 'Inbox') {
              let expanded = document.querySelectorAll('.scroll-list-item[aria-expanded="true"]')
              if (!expanded.length) {
                let count = unread.length
                for (let i = 0; i < bundles.length; i++) {
                  let match = re.exec(bundles[i].firstElementChild.innerText)
                  if (match) {
                    count += match[1] - 1
                  }
                }
                if (badgeCount !== count) {
                  ipcRenderer.send('notification', count)
                  if (count !== 0) {
                    new Notification('Inbox', {
                      body: (count === 1) ? '1 unread message' : count + ' unread messages'
                    })
                  }
                  badgeCount = count
                }
              }
            }
          }, 2000)
        }
      })()
    `).then(() => {
      ipcMain.on('notification', (event, arg) => app.setBadgeCount(arg))
    }).catch((e) => {
      console.error(e)
    })
  })

  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault()
    shell.openExternal(url)
  })

  mainWindow.on('closed', () => {
    // Dereference the window object.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  globalShortcut.register('CommandOrControl+R', () => mainWindow.reload())
  const template = [
    {
      label: 'Edit',
      submenu: [
        {role: 'undo'},
        {role: 'redo'},
        {type: 'separator'},
        {role: 'cut'},
        {role: 'copy'},
        {role: 'paste'},
        {role: 'pasteandmatchstyle'},
        {role: 'delete'},
        {role: 'selectall'}
      ]
    },
    {
      label: 'View',
      submenu: [
        {role: 'reload'},
        {role: 'forcereload'},
        {role: 'toggledevtools'},
        {type: 'separator'},
        {role: 'resetzoom'},
        {role: 'zoomin'},
        {role: 'zoomout'},
        {type: 'separator'},
        {role: 'togglefullscreen'}
      ]
    },
    {
      role: 'window',
      submenu: [
        {role: 'minimize'},
        {role: 'close'}
      ]
    }
  ]

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        {role: 'about'},
        {type: 'separator'},
        {role: 'services', submenu: []},
        {type: 'separator'},
        {role: 'hide'},
        {role: 'hideothers'},
        {role: 'unhide'},
        {type: 'separator'},
        {role: 'quit'}
      ]
    })

    // Edit menu
    template[1].submenu.push(
      {type: 'separator'},
      {
        label: 'Speech',
        submenu: [
          {role: 'startspeaking'},
          {role: 'stopspeaking'}
        ]
      }
    )

    // Window menu
    template[3].submenu = [
      {role: 'close'},
      {role: 'minimize'},
      {role: 'zoom'},
      {type: 'separator'},
      {role: 'front'}
    ]
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))

  createWindow()
})

app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})
