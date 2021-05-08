# Head Coach 09 Editor
An all purpose editor for NFL Head Coach 09.

## Features
- Change Team: You can change the user controlled team in any career file.

---

## Download Instructions
### Prereqs
1. Make sure 7-zip is installed on your computer

### Steps
1. Download the latest release on GitHub
1. Find the downloaded .7z file, right click and click 'Extract to HC09Editor/' or similar
1. Open the extracted folder.
1. Double click on HC09Editor.exe to open the app.

---

## Usage Instructions
### Changing User Controlled Teams
1. Open your career file from the app's start page by clicking 'Load Career File'. You will want to open the _USR-DATA_ file if using a PS3 or equivalent if on 360.

1. Click on the _Change Team_ menu option.
1. Click on the team logo that you would like to control.
1. Click on the _Save Career_ menu option.
1. Click on the _Close File_ menu option.
1. Re-load the file Head Coach 09 to see the change.

*NOTE*: The loading screen and initial team background will still have the old controlled team. That is fine, the stadium background will change before your next game.

You can be sure the change worked by looking at the top right to see your user controlled team's logo.

---

## Modifying/Building the Source Code
### Architecture
This application uses [Deskgap](https://github.com/patr0nus/DeskGap) - a lightweight alternative to Electron that is sadly no longer active. The idea is exactly the same - using Node.JS and front-end languages to create desktop applications.

This also uses a JS library that I created to read/edit/write DB files, named [madden-file-tools](https://github.com/bep713/madden-file-tools).

The front-end (renderer) uses [VueJS](https://vuejs.org/) v3.

### Deskgap Limitations
- Deskgap requires that all renderer process files are in the same directory. I used Webpack to bundle all JS and resources into one folder per window. 

- Deskgap does not bundle Chromium which cuts down on size. As a result, it relies on the OS's native WebView, which for most people will be a pre-Chromium version of Edge (not so great).

- There are no integrated DevTools, you have to use MS Developer DevTools from the Windows Store which can be quite annoying.

### Deskgap Advantages
I love Electron, but the file size can be really annoying for simple apps (>100MB). Deskgap provides a lightweight alternative and this app comes to about 10MB in an archive.

### Building the Code
1. Run `npm install` on the root directory to install all dependencies.
1. Run `npm run start` to start the app.

### Modifying the Code
1. Run `npm run watch` to tell webpack to watch for any changes.
1. Any changes made will bundle to the _dist_ folder (src/client/main/dist). This _dist_ folder will be what is ultimately packaged into the application when releasing.

### Releasing the App
Deskgap doesn't have a defined build/release process. I took the [Deskgap demo app](https://github.com/patr0nus/DeskGap/releases/tag/v0.2.0) and copy/pasted my files to get it to work. Deskgap.exe will simply run whatever code is pasted into the _app_ folder. From there I just used 7-zip to compress the files even further.