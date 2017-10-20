/* Copyright (c) 2015 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import React from 'react';
import { logger } from 'nrfconnect/core';
// import Store from 'electron-store';

import MemoryLayout from './components/MemoryLayout';
import ControlPanel from './components/ControlPanel';
import * as fileActions from './actions/files';
import * as jprogActions from './actions/jprog';
import appReducer from './reducers';

import './resources/css/index.less';

/* eslint-disable react/prop-types */

export default {
    onInit: dispatch => {
        document.ondrop = ev => {
            ev.preventDefault();
        };
        document.ondragover = document.ondrop;

        document.body.ondragover = ev => {
            /* eslint-disable no-param-reassign */
            if (!ev.dataTransfer.files.length) {
                ev.dataTransfer.dropEffect = 'none';
                ev.dataTransfer.effectAllowed = 'none';
            } else {
                ev.dataTransfer.effectAllowed = 'uninitialized';
            }
        };

        document.body.ondrop = ev => {
            Array.from(ev.dataTransfer.files).forEach(i => fileActions.openFile(i.path)(dispatch));
            ev.preventDefault();
        };
    },
    decorateMainView: MainView => (
        props => {
            if (props.fileError) {
                return (
                    <MainView>
                        <div className="alert alert-error">{ props.fileError }</div>
                    </MainView>
                );
            }

            return (
                <MainView>
                    <MemoryLayout {...props.loaded} targetSize={props.targetSize} />
                </MainView>
            );
        }
    ),
    mapMainViewState: (state, props) => ({
        ...props,
        loaded: state.app.file.loaded,
        targetSize: state.app.target.size,
        writtenAddress: state.app.target.writtenAddress,
        fileError: state.app.file.fileError,
    }),
    decorateSidePanel: SidePanel => (
        props => (
            <SidePanel>
                <ControlPanel {...props} />
            </SidePanel>
        )
    ),
    mapSidePanelState: (state, props) => ({
        ...props,
        loaded: state.app.file.loaded,
        mruFiles: state.app.file.mruFiles,
        targetIsReady: state.app.target.isReady,
        targetSize: state.app.target.size,
    }),
    mapSidePanelDispatch: (dispatch, props) => ({
        ...props,
        openFileDialog: () => dispatch(fileActions.openFileDialog()),
        openFile: filename => dispatch(fileActions.openFile(filename)),
        refreshAllFiles: () => { dispatch({ type: 'START-REFRESH-ALL-FILES' }); },
        performWrite: () => { dispatch({ type: 'START-WRITE' }); },
        performRecover: () => { dispatch({ type: 'START-RECOVER' }); },
        closeFiles: () => { dispatch({ type: 'EMPTY-FILES' }); },
    }),
    reduceApp: appReducer,

    mapSerialPortSelectorState: (state, props) => ({
        portIndicatorStatus: (state.app.target.port !== null) ? 'on' : 'off',
        ...props,
    }),

    middleware: store => next => action => { // eslint-disable-line
        switch (action.type) {
            case 'SERIAL_PORT_SELECTED': {
                store.dispatch(jprogActions.logDeviceInfo(
                    action.port.serialNumber,
                    action.port.comName,
                ));
                break;
            }
            case 'SERIAL_PORT_DESELECTED': {
                logger.info('Target device closed.');
                break;
            }
            case 'START-WRITE' : {
                const state = store.getState();
                if (state.app.file.loaded.blockSets.size === 0) {
                    return;
                }

                store.dispatch(jprogActions.write(state.app));
                break;
            }
            case 'START-RECOVER' : {
                store.dispatch(jprogActions.recover(store.getState().app));
                break;
            }
            case 'START-REFRESH-ALL-FILES' : {
                store.dispatch(
                    fileActions.refreshAllFiles(
                        store.getState().app.loaded.fileLoadTimes,
                    ),
                );
                break;
            }
            default:
        }
        next(action);
    },
};
