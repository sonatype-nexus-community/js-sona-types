/*
 * Copyright 2021-Present Sonatype Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
export interface ILogger {
  logMessage(message: string, level: string, ...meta: any): void;
}

export class TestLogger implements ILogger {
  public logMessage = (message: string, level: string, ...meta: any): void => {
    switch (level) {
      case DEBUG:
        console.debug(message, level, meta);
        break;
      case ERROR:
        console.error(message, level, meta);
        break;
      case INFO:
        console.info(message, level, meta);
        break;
      case TRACE:
        console.trace(message, level, meta);
        break;
      default:
        console.warn(message, level, meta);
        break;
    }
  };
}

export const DEBUG = 'debug';
export const ERROR = 'error';
export const TRACE = 'trace';
export const INFO = 'info';
