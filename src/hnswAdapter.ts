import { IVectorDB, SearchResult, VectorData } from './structures';
import { HierarchicalNSW } from 'hnswlib-wasm/dist/hnswlib-wasm';
import { loadHnswlib, syncFileSystem, HnswlibModule } from 'hnswlib-wasm';
import { normalizePath, App } from 'obsidian';

export class HNSWLibAdapter implements IVectorDB {
    private app: App;
    private hnswlib: HnswlibModule;
    private hnswIndex: HierarchicalNSW;
    private indexFileName: string;
    private dimension: number;
    private labelToIdMap: Map<number, number> = new Map();
    private idToLabelMap: Map<number, number> = new Map();
    private vectorDataMap: Map<number, VectorData> = new Map();

    public constructor(app: App) {
        this.app = app;
    }

    public async initialize(indexFileName: string, dimensions: number, maxElements: number): Promise<boolean> {
        this.hnswlib = await loadHnswlib();
        this.indexFileName = indexFileName;
        this.dimension = dimensions;

        this.hnswIndex = new this.hnswlib.HierarchicalNSW('cosine', dimensions, indexFileName);
        await syncFileSystem('read');

        const exist = this.hnswlib.EmscriptenFileSystemManager.checkFileExists(indexFileName);
        if (!exist) {
            this.hnswIndex.initIndex(maxElements, 32, 150, 42);
            this.hnswIndex.setEfSearch(32);
        } else {
            this.hnswIndex.readIndex(indexFileName, maxElements);
            await this.loadMaps();
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
            }
        }

        if (itemsToAdd.length === 0) return;

        const labels = this.hnswIndex.addItems(vectorsToAdd, false);

        labels.forEach((label, i) => {
            const item = itemsToAdd[i];
            this.labelToIdMap.set(label, item.id);
            this.idToLabelMap.set(item.id, label);
            this.vectorDataMap.set(item.id, item);
        });

    }

    async search(queryVector: number[], top_k: number): Promise<SearchResult[]> {
        const result = this.hnswIndex.searchKnn(queryVector, top_k, undefined);

        const searchresults: SearchResult[] = [];

        for (let i = 0; i < result.neighbors.length; i++) {
            const label = result.neighbors[i];
            const score = result.distances[i];

            const id = this.labelToIdMap.get(label);

            if (id === undefined) {
                continue;
            }

            const originalData = this.vectorDataMap.get(id);

            if (originalData === undefined) {
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
        await this.hnswIndex.writeIndex(this.indexFileName);
        await this.saveMaps();
    }

    async saveMaps(): Promise<void> {
        const idToLabel = this.getIdToLabelMap();
		const labelToId = this.getLabelToIdMap();
		const vectorDataMap = this.getVectorDataMap();

		const saveIdToLabel = JSON.stringify(Object.fromEntries(idToLabel));
		const saveLabelToId = JSON.stringify(Object.fromEntries(labelToId));
		const saveVectorDataMap = JSON.stringify(Object.fromEntries(vectorDataMap));

		await this.app.vault.adapter.write(normalizePath(`${this.app.vault.configDir}/plugins/Chumsa/ID_TO_LABEL_MAP.json`), saveIdToLabel);
		await this.app.vault.adapter.write(normalizePath(`${this.app.vault.configDir}/plugins/Chumsa/LABEL_TO_ID_MAP.json`), saveLabelToId);
		await this.app.vault.adapter.write(normalizePath(`${this.app.vault.configDir}/plugins/Chumsa/VECTOR_DATA_MAP.json`), saveVectorDataMap);
    }

    async loadMaps(): Promise<void> {

        const mapPaths = {
            idToLabel: normalizePath(`${this.app.vault.configDir}/plugins/Chumsa/ID_TO_LABEL_MAP.json`),
            labelToId: normalizePath(`${this.app.vault.configDir}/plugins/Chumsa/LABEL_TO_ID_MAP.json`),
            vectorData: normalizePath(`${this.app.vault.configDir}/plugins/Chumsa/VECTOR_DATA_MAP.json`),
        };

    try {
        const [idToLabelJson, labelToIdJson, vectorDataJson] = await Promise.all([
            this.app.vault.adapter.read(mapPaths.idToLabel),
            this.app.vault.adapter.read(mapPaths.labelToId),
            this.app.vault.adapter.read(mapPaths.vectorData),
        ]);

        const idToLabelObj = JSON.parse(idToLabelJson);
        const labelToIdObj = JSON.parse(labelToIdJson);
        const vectorDataObj = JSON.parse(vectorDataJson);
        
        this.idToLabelMap = new Map(
            Object.entries(idToLabelObj).map(([key, value]) => [Number(key), value as number])
        );

        this.labelToIdMap = new Map(
            Object.entries(labelToIdObj).map(([key, value]) => [Number(key), value as number])
        );

        this.vectorDataMap = new Map(
            Object.entries(vectorDataObj).map(([key, value]) => [Number(key), value as VectorData])
        );

        } catch (error) {
            this.idToLabelMap.clear();
            this.labelToIdMap.clear();
            this.vectorDataMap.clear();
        }
    }
    
    async resetMaps() {
        this.labelToIdMap = new Map();
        this.idToLabelMap = new Map();
        this.vectorDataMap = new Map();
    }

    async count(): Promise<number> {
        return this.hnswIndex.getCurrentCount();
    }

    async resetIndex(maxElements: number, dimensions: number): Promise<void> {
        this.hnswIndex = new this.hnswlib.HierarchicalNSW('cosine', dimensions, this.indexFileName);
        await syncFileSystem('read');
        this.hnswIndex.initIndex(maxElements, 32, 150, 42);
        this.hnswIndex.setEfSearch(32);
        
        await this.resetMaps();
        this.save();
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