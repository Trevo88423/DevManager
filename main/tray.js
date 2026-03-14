const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let tray = null;

function createTray(mainWindow, app) {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');

  // Create a small 16x16 icon programmatically as fallback
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) throw new Error('empty');
  } catch {
    // Generate a simple colored square as placeholder
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('DevManager');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Left-click toggles window visibility
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = { createTray, destroyTray };
