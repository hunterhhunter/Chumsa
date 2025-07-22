import { IVectorDB, SearchResult, VectorData } from './structures';
import { HierarchicalNSW } from 'hnswlib-wasm/dist/hnswlib-wasm';
import { loadHnswlib, syncFileSystem, HnswlibModule } from 'hnswlib-wasm';

export class HNSWLibAdapter implements IVectorDB {
    private hnswlib: HnswlibModule;
    private hnswIndex: HierarchicalNSW;
    private indexFileName: string;
    private dimension: number;
    private labelToIdMap: Map<number, number> = new Map();
    private idToLabelMap: Map<number, number> = new Map();
    private vectorDataMap: Map<number, VectorData> = new Map();

    public constructor() {
        
    }

    public async initialize(indexFileName: string, dimensions: number, maxElements: number): Promise<boolean> {
        this.hnswlib = await loadHnswlib();
        this.hnswlib.EmscriptenFileSystemManager.setDebugLogs(true);
        this.indexFileName = indexFileName;
        this.dimension = dimensions;

        this.hnswIndex = new this.hnswlib.HierarchicalNSW('cosine', dimensions, indexFileName);
        await syncFileSystem('read');

        const exist = this.hnswlib.EmscriptenFileSystemManager.checkFileExists(indexFileName);
        if (!exist) {
            this.hnswIndex.initIndex(maxElements, 32, 150, 42);
            this.hnswIndex.setEfSearch(32);
            this.hnswIndex.writeIndex(indexFileName);
        } else {
            this.hnswIndex.readIndex(indexFileName, maxElements);
            this.hnswIndex.setEfSearch(32);
        }

        return true;
    }

    async addItem(data: VectorData[]): Promise<void> {
        if (!this.hnswIndex) throw new Error("Index is not initialized.");

        const vectorsToAdd: number[][] = [];
        const itemsToAdd: VectorData[] = [];

        for (const each of data) {
            if (!this.idToLabelMap.get(each.id)) {
                vectorsToAdd.push(each.vector);
                itemsToAdd.push(each);
                this.vectorDataMap.set(each.id, each);
            }
        }

        if (itemsToAdd.length === 0) return;

        const labels = this.hnswIndex.addItems(vectorsToAdd, false);

        labels.forEach((label, i) => {
            const item = itemsToAdd[i];
            this.labelToIdMap.set(label, item.id);
            this.idToLabelMap.set(item.id, label);
        });

        console.log(`${vectorsToAdd.length}개의 새로운 아이템이 인덱스에 추가되었습니다.`);
    }

    async search(queryVector: number[], top_k: number): Promise<SearchResult[]> {
        const result = this.hnswIndex.searchKnn(queryVector, top_k, undefined);

        const searchresults: SearchResult[] = [];

        for (let i = 0; i < result.neighbors.length; i++) {
            const label = result.neighbors[i];
            const score = result.distances[i];

            const id = this.labelToIdMap.get(label);

            if (id === undefined) {
                console.log(`${label}에 해당하는 ID가 없습니다.`);
                continue;
            }

            const originalData = this.vectorDataMap.get(id);

            if (originalData === undefined) {
                console.log(`${id}에 해당하는 VectorData가 없습니다.`);
                continue;
            }

            const eachResult: SearchResult = ({
                id: id,
                score: 1 - score, 
                metadata: {
                    filePath: originalData.metadata.filePath,
                    key: originalData.metadata.key,
                    text: originalData.metadata.text,
                }
            });

            searchresults.push(eachResult);
        }

        return searchresults;
    }

    async save(): Promise<void> {
        // 1. Index를 저장
        await this.hnswIndex.writeIndex(this.indexFileName);
    }

    async count(): Promise<number> {
        return this.vectorDataMap.size;
    }

    async loadMaps() {
        // TODO: 불러온 String으로 Map 구성하는 코드 작성해야함.
    }

    getIdToLabelMap() {
        return this.idToLabelMap;
    }

    getLabelToIdMap() {
        return this.labelToIdMap;
    }

    getVectorDataMap() {
        return this.vectorDataMap;
    }
}