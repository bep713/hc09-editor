// const regeneratorRuntime = require('regenerator-runtime');
// const { render, fireEvent, cleanup } = require('@testing-library/vue');
// const RecentFilesList = require('../../src/client/main/components/RecentFilesList.vue').default;
// const { expect } = require('chai');

// const recentFiles = [
//     {
//         "type": "file",
//         "path": "C:/test/path.db",
//         "time": 100
//     },
//     {
//         "type": "root",
//         "path": "C:/test/folder",
//         "time": 100000
//     }
// ]

// describe('Recent files list', async () => {
//     afterEach(() => {
//         cleanup();
//     });

//     it('recent files header', () => {
//         const { getByText } = render(RecentFilesList, {
//             props: {
//                 recentFiles: recentFiles
//             }
//         });

//         getByText('Recently opened items');
//     });

//     it('contains file path', () => {
//         const { getByText } = render(RecentFilesList, {
//             props: {
//                 recentFiles: recentFiles
//             }
//         });

//         getByText('C:/test/path.db');
//     });

//     it('contains access time', () => {
//         const { getByText } = render(RecentFilesList, {
//             props: {
//                 recentFiles: recentFiles
//             }
//         });

//         getByText('12/31/1969 07:00 PM');
//     });

//     it('contains 2nd recent file', () => {
//         const { getByText } = render(RecentFilesList, {
//             props: {
//                 recentFiles: recentFiles
//             }
//         });

//         getByText('C:/test/folder');
//     });

//     it('contains a button to remove the recent file', () => {
//         const { getAllByTestId } = render(RecentFilesList, {
//             props: {
//                 recentFiles: recentFiles
//             }
//         });

//         const buttons = getAllByTestId('remove-button');
//         expect(buttons.length).to.be.greaterThan(0);
//     });

//     it('can click the `x` to remove the recent file from view', async () => {
//         const { getAllByTestId } = render(RecentFilesList, {
//             props: {
//                 recentFiles: recentFiles
//             }
//         });

//         const buttons = getAllByTestId('remove-button');
//         await fireEvent.click(buttons[0]);

//         const filesShown = getAllByTestId('recent-file');
//         expect(filesShown.length).to.equal(1);
//     });

//     it('can alter the header text through a prop', () => {
//         const { getByText } = render(RecentFilesList, {
//             props: {
//                 headerText: 'Test',
//                 recentFiles: recentFiles
//             }
//         });

//         getByText('Test');
//     });

//     it('empty message displays when recent files are empty', () => {
//         const { getByTestId } = render(RecentFilesList, {
//             props: {
//                 headerText: 'Test',
//                 recentFiles: []
//             }
//         });

//         getByTestId('empty-message');
//     });

//     it('empty message does not display when recent files list is populated', () => {
//         const { queryByTestId } = render(RecentFilesList, {
//             props: {
//                 headerText: 'Test',
//                 recentFiles: recentFiles
//             }
//         });

//         const message = queryByTestId('empty-message');
//         expect(message).to.be.null;
//     });
// });