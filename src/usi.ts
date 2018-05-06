import { spawn, ChildProcess, SpawnOptions, execFile, ExecFileOptions } from "child_process"
import { Observable } from 'rxjs/Rx';

export default class USI {
    readonly stdout: Observable<string[]>;
    options: Map<string, Map<string, string>>;
    name: string;
    author: string;

    public static spawn(path: string, args: string[], options: SpawnOptions): USI {
        const process: ChildProcess = spawn(path, args, options);
        return new USI(process);
    }

    public static execFile(path: string, args: string[], options: ExecFileOptions): USI {
        const process: ChildProcess = execFile(path, args, options);
        return new USI(process);
    }

    constructor(public engine: ChildProcess) {
        this.stdout = Observable.fromEvent<Buffer | string>(engine.stdout, 'data')
            .map(chunk => {
                if (typeof chunk == "string") {
                    return chunk;
                } else {
                    return chunk.toString();
                }
            })
            .flatMap(s => s.split('\n'))
            .map(s => s.trim().split(' '))
            .share();

        //this.stdout.subscribe(line => console.log(line.join(' ')))

        engine.stderr.on('data', (data) => {
            console.log(`stderr: ${data}`);
        });

        engine.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
        });
    }

    async init(): Promise<void> {
        const stdout = this.stdout.shareReplay()
        const usiok = stdout.filter(([command]) => command == 'usiok').first();

        const name = stdout
            .takeWhile(([command]) => command != 'usiok')
            .filter(([command, id]) => command == 'id' && id == 'name')
            .map(([, , ...name]) => name.join(' '))
            .first();
        const author = stdout
            .takeWhile(([command]) => command != 'usiok')
            .filter(([command, id]) => command == 'id' && id == 'author')
            .map(([, , ...name]) => name.join(' '))
            .first();
        const options = stdout
            .takeWhile(([command]) => command != 'usiok')
            .filter(([command]) => command == 'option')
            .map(([, ...args]) => {
                const option = new Map<string, string>()
                for (let i = 0; i < args.length / 2; i++) {
                    option.set(args[i * 2], args[i * 2 + 1]);
                }
                return option;
            })
            .toArray()
            .map(options => new Map(options.map(option => ([option.get('name'), option]) as [string, Map<string, string>])));

        await this.write('usi');

        this.name = await name.toPromise();
        console.log(`engine name: ${this.name}`);
        this.author = await author.toPromise();
        console.log(`engine author: ${this.author}`);

        this.options = await options.toPromise();
        console.log('options', this.options.keys());

        await usiok.toPromise();
        console.log('recieve usiok')
    }

    async ready() {
        this.write('isready');
        await this.stdout.filter(([command]) => command == 'readyok').first().toPromise();
        console.log('recieve readyok')
    }

    async setOption(name: string, value?: string|number) {
        let line = `setoption name ${name}`;
        if (value) {
            line += ` value ${value}`;
        }

        await this.write(line);
    }

    write(line: string): Promise<void> {
        console.log(line);
        return new Promise((resolve) => {
            this.engine.stdin.write(line + '\n', () => resolve());
        })
    }

    kill() {
        this.engine.kill()
    }
}


