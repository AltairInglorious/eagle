# Eagle Project

Eagle is a minimalistic infrastructure monitoring system written for [Bun](https://bun.sh).

## Running the project

### API

#### Configuration

WIP

#### Run

To run the API, navigate to the `apps/api` directory and run:

```bash
bun run start
```

### Worker

#### Configuration

WIP

#### Run

To run the worker in production mode, first build the worker:

```bash
cd apps/worker
bun run build
```

Then, run the compiled binary:


```bash
./dist/eagle-worker
```
