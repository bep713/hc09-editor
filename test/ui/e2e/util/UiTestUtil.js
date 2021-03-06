module.exports = {
    'enterFilePath': async (page, selector, path) => {
        await page.evaluate(`const textbox = document.querySelector('${selector}'); textbox.classList.remove('hidden');`);
        await page.type(selector, path);
        await page.keyboard.press('Enter');
        await page.evaluate(`const textbox = document.querySelector('${selector}'); textbox.classList.add('hidden');`);
    },

    'sendSaveKeyboardShortcut': async (page) => {
        await page.keyboard.press('Control+s');
    },

    'sendUndoKeyboardShortcut': async (page) => { 
        await page.keyboard.press('Control+z');
    },

    'sendRedoKeyboardShortcut': async (page) => {
        await page.keyboard.press('Control+y');
    }
}