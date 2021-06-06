const path = require('path');
const sinon = require('sinon');
const expect = require('chai').expect;
const proxyquire = require('proxyquire').noCallThru();

const deskgapMock = {
    'app': {
        'getPath': sinon.spy(() => { return 'test'; })
    }
};

const astEditorService = proxyquire('../../src/server/ast-editor/ast-editor-service', {
    'deskgap': deskgapMock
});

describe('ast editor service unit tests', () => {
    let result = null;

    describe('read ast (non-recursive)', () => {
        const astPath = 'D:\\Media\\Games\\NFL Head Coach 09 [U] [BLUS-30128]\\PS3_GAME\\USRDIR\\qkl_boot.ast';

        before((done) => {
            astEditorService.readAST(astPath, false, true)
                .then((astFile) => {
                    result = astFile;
                    done();
                })
        });

        baseBootASTTests();

        it('does not read children if recursive read is set to false', () => {
            expect(result.tocs[0xe].file).to.be.undefined;
        });
    });

    describe('read ast (recursive)', () => {
        const astPath = 'D:\\Media\\Games\\NFL Head Coach 09 [U] [BLUS-30128]\\PS3_GAME\\USRDIR\\qkl_boot.ast';
        let result = null;

        before(function(done) {
            this.timeout(10000);

            astEditorService.readAST(astPath, true, true)
                .then((astFile) => {
                    result = astFile;
                    done();
                })
                .catch((err) => {
                    done(err);
                })
        })

        baseBootASTTests();

        describe('extracts children', () => {
            describe('first toc', () => {
                it('number of results', () => {
                    expect(result.tocs[0xe].file.tocs.length).to.equal(156);
                });

                it('file extension', () => {
                    expect(result.tocs[0x2b1].file.tocs[0].fileExtension).to.equal('dds');
                });

                it('preview', () => {
                    const brownsLogo = result.tocs[0x2b0].file.tocs.find((toc) => {
                        return toc.index === 3;
                    });

                    expect(brownsLogo.preview).to.equal('data:image/webp;base64,UklGRgwRAABXRUJQVlA4WAoAAAAQAAAAfwAAfwAAQUxQSEUEAAABoCNtmyNJyZpYC26AtaJ3PQKLK7CNPAA3ILaxNTdQPSyH0FprjavFzKAszYjq/P8/O8UvjBZTXZ0VeBARE+D+03HTNM2/rNHdu999l1KM3347nYwGZrR7YIspLcQoImIHdw/F5e+zLZcU5yHMYxZbXl6//trajV7LOWeTGBBOiSGZlVLKy1WbqOoCwiKuDYu4kHO+UKsp6wrAjmFFnlXpYWa2iACAGwWAUCznl13TNE1NxsLMjADYQ4CQc86juuzJwiFgT2GBpxU5JyLCh4eMvV3CXImmmbBZAMB+A0Qzq8SrzIKAvQcIZlqFPWZGwG2EYKoV+JmZGXA7Iaiqczc+eGGb9tgiAG4reLMn31PV6fZMmSMAbq/3ZqqqsjUTZgbArfIeEVVkW3gBK4Aie9shJghYQ0gp3bENr4ohYB1TSmkLRiIBsCIH/RMRqIqN+3ZnSgmwnpBV+5ZSSlgTVB33a1IbBNX9fkmNtEdNc9EMAetJRDMR6dWBFcCKeu9nItNemYXKEIm4Pt1shlUhgNIv90MpgDUtpZR4U69KVVq/5CU3WN6HUsoV1+vLdUEfy2Ou54+rHmNNk4769kVtomrftDKAqpPeHVcFQVV7ZhagLt7s6fV2dnZ2NoV1Qe/N1rvl0hC9umQ8fXVPxMwOhsabiAgzs8gSk8mG6htsZY6EgMGYxxvx9QFcCquRmTeCNYaluBKYebyJtkanZmbuLsYY6wdoNu7s7UFASGadPTgQaDbq6myMEeqHUOygq0ZEBoGYhw2B+dWudkVwILiriyJ+KKbdOKd6TETVQ4hmXe2rHwY0u9DRWK0dAoRi33Tk1PwwBJt39XqMMQ4Bml3a2enEDQRCsdcHLph1dd1QYHeOmf0AIJRyxXU8ZsaB+KErx+wHomwAhgA3IYKwTUQUiYg2x8xNV3uStiz+ebRlYzGE/tE6dPx77MGMedKZE4v9oxkhokdEAIrkN+eZuenuIWPsOczb3wIizogopZTQIxIRdZdzztpswJn1DmCOAEBEeSEgYnvSRQgBEAAWLm6oPdVfPUiliJnZgkZEOjyEZbSCAA6PASCUnLNrNoRrEhGiR/SeqCNChHmxlb/ecuZMUtVARIToW+9bv7IFxJDMLGe3IRERICIMIeJRizHGSERHnVBoW1RVvXr12WfvOe+WTlS1lFIQEYk80Ywg55yZmYmIbnCbvnkBiALO/O9/4RIlOvr7xC8JK4h86z0GVXWn3V+iS5bO17jL9bDZF5kD+NnhyQznK1QJ/Yn3HhFDCIgErfceMZuq6/CVBVW1lUv2xq6fTSNiiQgX52Yxfus+VVWZI6Jv/z7627fet94jYjSzfdfxlTfX+v7Ry67XXteenXfOXSiFmbmUUvjo6CillJiZRWTiNnzNGbeVu2u85la/uoqZ15i6ao8mu7u7k5Fbf/TqaV4duQG+cOWJD3/55dfPr47d/0YEAFZQOCCgDAAA0DMAnQEqgACAAD5tMpNGpCMhpqicPBDQDYlAGdsht3T8R5NP0ITivMA51fmA/ZL1uPQr/qPUA/znUAc/J7Gn90/6vpd5ir2of5bwl8UfpT2z9VvLn0t4Ef57yH/4XgD77P5z1AvyH+X/6P7U/eZ9o7JnTf716BHqz84/yX5jf5D0HNSnIA/k/9Z/4HrH/sPAw+4/4v2AP5f/XP+d90n0t/xH/j/y35c+yz83/vX/O/zXwC/yb+pf7T+7f5j9o/m49bP7Vf/X3Ov2HPz2LJXlS7eOeUfW3jKgvz84OvlCj4ShCpP47VrCFo6O3fs540sh8a7HuQtxs5PVgTXoar/tMIJCJ0ahcJ3Bnh4fNrfJ7pzwtAdBvqpxUzQmLy3zqbYLDlD9DI+sgOc90Ax9gmkeSnruIxzofvlTyZ41TWscC1bIbIDKWGAu0jHstve/OKUFHwST3P41eRzNxzOJLWNhHVG8OetXhf5RNnozy8dijs7S9YcKQtBmzBYanI7ShSgx6PU7ePUSbsmYJWOC1TtOBPF5z39NZ3us171uyMB8zOmskniNZJwAAP7w61JUR8I60kNiqNL/i8SClZI611XEiBnTbgtZePSveY6sgrLLZk4fPPnV8kHdqLx3xgCRaG+cv2wQd3PXm37xxsvkTp3H6aI3KiqZl+7VDT6DN9T4ehRk3Ud3UdP9cS/dvEditcYzO9jkJxMsZqz0D/4WIy1qhc3zFPIvDkD7VTVCpLd67TftZpEV7d+WkUqtupkxE42qNdAEAzoh+BhODmFkKA3Rg15sT9Ie2QsvVy/+JjG8ybv5jNcgCznoP9YunUCmfwEOT6VjCx6NVGTlz9c77CRHpoiVEft1nVx58XzoPtg7Wqg345cmZXNoZ0rT62qYBsHY9C2YIeLvldtADUcevA1wqcM+V9+k7YTp6stFSrnbGDaDmw6oLdWxKMw3gGSqEnV1QJueA3rfF2Rw/dyvQFa3uDi/I6ISMCHNF1wo3rV8svBwI7qNXZZrjYeP4SHdsf57NgMycF0EpqCQP9cOTkfLwhw4S8cKIXSAmI6m2+BSf/1UmcadTYg6nFCIaCpULolvPBHhA/AtOfhsrpDYAtdrSdQcpxsnYqJhlQbFasRwHypP3rHqEJgDic4FiasZ3vzfjPhrH7LGtAFCYjF332RAhOXMO7+tt3SLgAq/BBWfjzuAXAbjzTjD9KRLUz6NVF/M9elTTl5CkByvmoTUGQaz+2W9ldXu2rvor+2Qyv8dTAcZBo34ebU1XkXIm+FWVxzPvOGgxCMVnzKs5Z2AFy6ObGMs3Lq0721R2JyDg0a44QgEXBSgStqLF5GcfJLd05H8Puj8926ZnJ7jHvVnQaxjQ/kLVO9qdQB3/IHF5dWRf6RulJKZLrc9ok9RTC9Ow49zx2mUyV3MnEr1E9XuXorAmh/oFP1Nl3BFfFYudn4yB+hZ/Y6RIDXbtpdq2GbnJaiq5y7FfRsbn06fiRn690oNX1QZBfqG0IW8XlndW+u35Xo9ZjOdPJpTwscQPyke7yPrl3VFYwdqjWlihZkCIbJj7wqNooqO3ol9g3FbfKJF+//Ecun2f1F+f2IF3KsNkh7mczv/DIRG9bIA7aKXXx1gjaaTmwthIqbWh/0nc7eukaL0er+ozQjTQ3WURXLJgN+0+l976fIge/71ePM+aKQY2kIrVwFmMIB1A/56mZgWuvsilhKUJMpdZAzemNjEYThp8B8eqR98I1DHzOFaLbKD9RgHTgrWvXEdbkWQvP9GoWVKN9XpIFksYRvZn6e3+z5yalLEaM2ncPbyP6yhdF+lhyaxDdvHNdskjSPu9wkZYQh69djBnl4VL8Lmlu91kyFrYBN4AHUKZL5EXp1ZSQEaez/Q4T2LhZfkGVJUO+7H0GmLKzh6Qemwqf9Ido3IT74/zlFl+ZVbH2o4mGQZVuMeEwC2Ao3zmuYrXYLUSD2cSkFFF4p9pkX3huwBjF2T+iAbn3LUnAedvg6ku3eyijp6PFBz+gI1+yu0mBovGmR98t/GirYR9qZOQ6Te7mJdxjFngU/z34y/bSObyZjHqAT9ARjrb58XSd098JPCP180BG1J4qPz6NDwDnjbt01nTKNZPnHt2fiJ9VO3t3r0Qy5GUAXUE5sJVLct1CKhO+iE2/GnJoooi1UxMjPfJxjoEAhxqWSSwwSrTrTUvonAMMw79fJJEgQnNEarGKDXq32HiauGvNfDPqi2lsRQgw1kEwWhp7rI1xirGh7VH4nvbHdxbnlsHoKpcxR3uKLP1IVC7Ywb5Rj69ojF7FgJaODzUoVVHfEHkmL5aNeyjadmxqM4XdUt1IbBdZM/Tmfo9h8NHPbZfYsc4ZkWeIPF7gWqh+giuMfvKtjgT1YM5zUvgHvvC/zRix3r7N5pPUlu7Fu/lawfV084eXpFjzNRXAJQdeu2JMwJTCfXMFwEo4xQjRsX5u1MEqusrjw16PJzJc389cWorLLtWf+EJTBvF47bJtrR6APDEsDPKX9fSGQ+e0SxluVsAZz7XYrt+yBDDLKo4fG/6DNMxmQR4uWrCQsaGPVFEoknNisKUv5LW3B+w6LHw0hfIC52KKjw2/HeDU+MCmpaSEPVDSvm2w7VsZTabFldkldMiQxl0xqND3AdpxowF/AYeuokzHYlQfZACG6g/AVF+J9NN7KpC+js9cQAwouq9xo1itq/wFHRgYmdTsCEbIA0fXOj4HqwjG37RdxnJBWUgSvZ+FQxWRqr5zyWK64cUZ3P8fObK7JVAvA+g3Uwt39TD9rGfN+S6+G70j3rcN6Rvm/yTi/GRNKHV7zQDnF10y4Jpd91DXVhrH9Tq0WitLvz5e001ahSuFbB5l9Ntvg1HQksxxyA3M52ds4auifgp+ved0J+swW3Kpx/pQV+MTZ1H5zwKakaVBoBFtbuxdxvbou15cq3/lBCSoSteT3nLpp9N8RBf5ztvwwn0epzuTKChiaRicHOo9UpEJ1ciiA2rVI8yjyz+XdSPWjgG6qIJf1kv38UpUIhMpxXGYIay+nJMo+FjGE0nJ2PIw+QBOoEN3RqzuQJapdiD/R8cfXo6DLgUAbVTFLNdUa68r1kZN3SFWlnrTVB6lG9/k5Z/w0QBl9B6bHifbOZ9v8FK7H0WifzwDe4mszz9gPH77CLv3Fcrn18oaxH5Z5JEIwilYZ4F4OAIijKqX7GWipSFma2+CQcUnaJAGpiJDx0ledUk7q2CbPkcTIKapIsuFz4b1v8jutbFr+C/FHceyjdJqTw4ikE5NViaCJHYU0MN+KawTWPXRiXDmPz+hJaEBkzoUdzCTqfy/9d2QEtkFLlTNfcIlx5U8qaEb2b7wun01HrjJzfSZ0O8aARE/sngRh1zZPlFAF09nqRc3SsWUlU8C4dVE0ECQcUN7/vYCtPGRcaZXohV5PmXQxZvHpAhsnbP3PsM2jL6HkmUdLCLW2OWdcCLdxWWw70G7eH8sctoHxgWg16TB0Uhd7vF1S0KD0Ws80Waintn56hdGW+QEx1fR4DDA9C5ge8O4WborJxy5YiE4BExL5SNmfOfgLh/q7k5MHDvk2DKwVah6PYvrWJJZj9ZKeftr+uwb/Z9WdwO9FPpfR1D7cQU87m+uXX3BlLwudzu9AYuCtrQnetkaCXAEfRjwTflkss/d6Y6TbjH/YeVmuzvlSBmgsE4uioJcCl3r7v6446CgCaTu+J1mkPeUEfkLlzTIlggRHJML8UO6o/r4mlN5GEeQAAMg/hvCgn6J/h81iBlVD9LC8HnKrK156MEo6tEzbG3e8eLGx7mMF5MBFChux52CkWZeaA5Bw/cgmnDSb8Nz3SAEua8HDKIEYjCesc+/bgXZlu/4m/zf96PjmYy6JhSe0HvaqYzkIXQmsui6/vvLYcwWycNT3Yft14pCkggKIsQU6aofCPjMJQ2fE1xNt+HuAWze3dvhC1pyBnv0TqXi46dcjNcyG0wo9a5uMhyRzqfvwxdu5pj5/XRDHvhjaeLxSrRSQSFLs0YemAbWMix31zODBoBYV5w5wQ5DH2/DCwWo64+f0mVQC/ruxo0hTmvBJIMTuSHA5yNnQSI37BSevqTd2HrmRYsGMBXV97x7Dd0np0NKM327/PesUNzzWOehcT6k9cCTs0TMI8n6khVWjicNasV5VeYjWzJ57oJXCx9vSad8jzalah66HIkMFbNe8NXncFZkGegQhuyz69rBP6RoNGndy9wBXXaGK4a4vFJnNuAzPGU1XjfL9xgIuTdniD06e1RZC1r0ZsT4Q+Xvu+WX0cITNcRyCkM/Hf/s7j/+3xmYAAAAAAAA==');
                });
            });
        });
    });

    describe('export', () => {
        const astPath = 'D:\\Media\\Games\\NFL Head Coach 09 [U] [BLUS-30128]\\PS3_GAME\\USRDIR\\qkl_boot.ast';
        const exportPathRoot = path.join(__dirname, '../data');

        before((done) => {
            astEditorService.readAST(astPath, false, true)
                .then((astFile) => {
                    result = astFile;
                    done();
                })
        });
        
        it('can export a file in the root AST', (done) => {
            astEditorService.exportNode(path.join(exportPathRoot, 'exportRootAST.dat'), {
                'key': '0_244'
            }, true)
                .then(() => {
                    done();
                })
        })
    });

    function baseBootASTTests() {
        it('result contains all expected tocs', () => {
            expect(result.tocs.length).to.equal(727);
        });
    
        describe('file extensions', () => {
            it('DAT', () => {
                expect(result.tocs[0].fileExtension).to.equal('dat');
            });
    
            it('AST', () => {
                expect(result.tocs[0xe].fileExtension).to.equal('ast');
            });
    
            it('P3R', () => {
                expect(result.tocs[0xf].fileExtension).to.equal('p3r');
            });
    
            it('DDS', () => {
                expect(result.tocs[0x15].fileExtension).to.equal('dds');
            });
    
            it('XML', () => {
                expect(result.tocs[0x1c].fileExtension).to.equal('xml');
            });
    
            it('DB', () => {
                expect(result.tocs[0x22].fileExtension).to.equal('db');
            });
    
            it('EBO', () => {
                expect(result.tocs[0xfb].fileExtension).to.equal('ebo');
            });
    
            it('RSF', () => {
                expect(result.tocs[0xd8].fileExtension).to.equal('rsf');
            });
        });
    
        describe('previews', () => {
            it('blank preview if not dds', () => {
                expect(result.tocs[0].preview).to.equal('');
            });
    
            it('expected base64 result', () => {
                expect(result.tocs[0x15].preview).to.equal('data:image/webp;base64,UklGRjIAAABXRUJQVlA4ICYAAADQAgCdASogACAAPm00lkekIyIhKAgAgA2JaQAAPaOgAP7gAAAAAA==');
            });
        });
    }
});
