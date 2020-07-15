/* eslint camelcase: 0 */
const SyncClient = require('twilio-sync');
const credentials = require('../env');
import { Async } from 'async-test-tools';
import { expect } from 'chai';


export default class SyncClientInstance {
    constructor(accessToken) {
        // region and productId are required for Flex sync maps
        this.syncClient = new SyncClient(accessToken, {
            region: credentials.region,
            productId: 'flex_insights'
        });

        this.syncClient.on('connectionError', this.connectionErrorHandler);
    }

    shutdown() {
        this.syncClient.removeListener('connectionError', this.connectionErrorHandler);
        this.syncClient.shutdown();
    }

    connectionErrorHandler(connectionError) {
        console.log('Sync Client connection was interrupted: ' + connectionError.message +
          ' (isTerminal: ' + connectionError.terminal + ')');
    }

    /**
     * Fetches sync map for a task
     * @param {string} taskSid - task sid
     */
    async _fetchSyncMap(taskSid) {
        const fetchOp = () => this.syncClient.map({
            id: `${taskSid}.CS`,    // these values can change anytime without notice
            mode: 'open_existing'
        });
        const delayMs = 500;
        const retry = 3;
        return this.retryOperation(fetchOp, delayMs, retry);
    }

    /**
     * Verify that a worker joined the conference
     * @param {string} syncMap - Sync Map for a task
     * @param {string} workerSid - The expected worker sid to join the conference
     */
    async waitForWorkerJoin(syncMap, workerSid) {
        return Async.waitForEvent(syncMap, 'itemAdded', (args) => this.hasWorkerStatus(workerSid, 'joined', args));
    }

    /**
     * Verify that a worker left the conference
     * @param {string} syncMap - Sync Map for a task
     * @param {string} workerSid - The expected worker sid to join the conference
     */
    async waitForWorkerLeave(syncMap, workerSid) {
        return Async.waitForEvent(syncMap, 'itemUpdated', (args) => this.hasWorkerStatus(workerSid, 'left', args));
    }

    hasWorkerStatus(workerSidVal, statusVal, ...args) {
        for (let obj in args) {
            const { item: { value: { worker_sid, status } = {} } = {} } = obj || {};
            if (worker_sid === workerSidVal) {
                expect(status).to.equal(statusVal);
                return true;
            }
        }
        return false;
    }

    /**
     * Verify customer hold status
     * @param {string} syncMap - Sync Map for a task
     * @param {string} hold - The expected hold status for customer
     */
    async waitForCustomerHoldStatus(syncMap, hold) {
        return Async.waitForEvent(syncMap, 'itemUpdated', (args) => this.isCustomerHold(hold, args));
    }

    isCustomerHold(holdVal, ...args) {
        for (let obj in args) {
            const { item: { value: { participant_type, hold } = {} } = {} } = obj || {};
            if (participant_type === 'customer') {
                expect(hold).to.equal(holdVal);
                return true;
            }
        }
        return false;
    }

    /**
     * Verify worker hold status
     * @param {string} syncMap - Sync Map for a task
     * @param {string} workerSid - worker sid
     * @param {string} hold - The expected hold status for customer
     */
    async waitForWorkerHoldStatus(syncMap, workerSid, hold) {
        return Async.waitForEvent(syncMap, 'itemUpdated', (args) => this.isWorkerHold(workerSid, hold, args));
    }

    isWorkerHold(workerSidVal, holdVal, ...args) {
        for (let obj in args) {
            const { item: { value: { worker_sid, hold } = {} } = {} } = obj || {};
            if (worker_sid === workerSidVal) {
                expect(hold).equal(holdVal);
                return true;
            }
        }
        return false;
    }

    /**
     * Verify that an external participant joined the conference
     * @param {string} syncMap - Sync Map for a task
     */
    async waitForExternalJoin(syncMap) {
        return Promise.race([
            Async.waitForEvent(syncMap, 'itemAdded', (args) => this.isExternalCallJoin(args)),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout while waiting for external participant join')), 5000))
        ]);
    }

    isExternalCallJoin(...args) {
        for (let obj in args) {
            const { item: { value: { participant_type, status, worker_sid, reservation_sid } = {} } = {} } = obj || {};
            if (participant_type === 'unknown') {
                expect(status).to.equal('joined');
                expect(worker_sid).to.equal(null);
                expect(reservation_sid).to.equal(null);
                return true;
            }
        }
        return false;
    }

    async wait(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    async retryOperation(operation, delay, times) {
        return new Promise((resolve, reject) => {
            return operation()
                .then(resolve)
                .catch((reason) => {
                    if (times - 1 > 0) {
                        return this.wait(delay)
                            .then(this.retryOperation.bind(null, operation, delay, times - 1))
                            .then(resolve)
                            .catch(reject);
                    }
                    return reject(reason);
                });
        });
    }
}
