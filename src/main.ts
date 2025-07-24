import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, setIcon, normalizePath } from 'obsidian';
import { SmartEmbedModel } from 'smart-embed-model';
import { SmartEmbedOpenAIAdapter } from 'smart-embed-model/adapters/openai';
import { generateEmbeddingsForMarkdown} from './generateEmbeddingsForMarkdown';
import { EmbededData, VectorData, createMockData } from './structures';
import { HNSWLibAdapter } from './hnswAdapter'

// Remember to rename these classes and interfaces!


interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'hungry'
}

export default class MyPlugin extends Plugin {
	settings: SampleSettingTab;
	embedModel: SmartEmbedModel;
	vectorDB: HNSWLibAdapter;

	async onload() {
		await this.loadSettings();
		this.registerMarkdownPostProcessor((element, context) => {
			// 렌더링된 요소 안에서 모든 헤딩 태그를 찾기
			const headings = element.querySelectorAll("h1, h2, h3, h4, h5, h6");

			// 찾은 각 헤딩에 대해 아이콘을 추가
			headings.forEach(headings => {
				if (headings.querySelector(".chumsa-icon")) {
					return;
				}

				// 아이콘으로 사용할 span 요소 생성
				const iconEl = headings.createEl('span', {
                    cls: 'chumsa-icon', // CSS 스타일링을 위한 클래스
                    attr: {
                        'aria-label': '관련 자료 찾기', // 마우스를 올렸을 때 나올 툴팁
                    }
                });

				setIcon(iconEl, 'link');

                // 아이콘 클릭 시 실행할 이벤트를 등록합니다.
                iconEl.addEventListener('click', () => {
                    // 여기에 아이콘 클릭 시 실행될 로직을 작성합니다.
                    // 예: 사이드바 열고 관련 자료 검색 결과 보여주기
					new Notice("이거 누르셨네요?")
                    console.log(`'${headings.textContent}' 문단과 관련된 자료를 검색합니다.`);
                    // this.openSideBarWithResults(heading.textContent);
                });
			})
		})
		
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// 옵시디언 UI가 완전히 준비되면 initialize 함수를 실행하도록 예약
		//this.app.workspace.onLayoutReady(this.initialize.bind(this));

		// DONE: 벡터DB 어댑터 테스트
			// DONE: Mock 데이터로 addItem, Search, Save까지 테스트
		// TODO: Index 초기화 방법 찾고 테스트
// 		this.vectorDB = await new HNSWLibAdapter(this.app);
// 		await this.vectorDB.initialize('saved_index.dat', 1536, 10000);
// 		await this.vectorDB.resetIndex(10000, 1536);
// 		const mock = createMockData(10, 1536);
// 		await this.vectorDB.addItem(mock);
// 		const query = createMockData(1, 1536).at(0)!;
// 		const searchResult = this.vectorDB.search(query.vector, 10);
// //
// 		(await searchResult).forEach((item, index) => {
// 			console.log(`${index+1}번째로 가까운 아이템: ${item.id}, ${item.score}`);
// 		})

// 		await this.vectorDB.saveMaps();
// 		await this.vectorDB.save();

// 		console.log(`지금 인덱스에 ${(await this.vectorDB.count()).valueOf()}개 있음.`);
		await this.testHNSWLibAdapterRoundTrip();
	}

	/**
     * 플러그인의 모든 무거운 초기화 로직을 처리
     * 이 함수는 옵시디언의 UI가 완전히 로드된 후에 호출
     */
	async initialize() {
		console.log("첨사: 본격적인 초기화를 시작합니다...");
		
		// 임베딩 모델 초기화
		this.embedModel = new SmartEmbedModel ({
			model_key: 'text-embedding-3-small',
			adapters: {
				openai: SmartEmbedOpenAIAdapter
			},
			settings: {
				api_key: process.env.OPENAI_API_KEY
			}
		});

		this.addCommand({
			id: "reindex-vault",
			name: 'Re-index all notes',
			callback: () => {
				this.embedAllFiles();
			}
		})

		this.startIndexing();
		console.log("첨사: 초기화가 완료되었습니다.");
	}

	/**
     * Vault의 모든 마크다운 파일을 순회하며 임베딩을 생성합니다.
     * @returns 생성된 모든 임베딩 데이터의 배열을 담은 Promise
     */
	async embedAllFiles() {
		// 마크다운 파일 전부 불러옴
		const markdownFiles: TFile[] = this.app.vault.getMarkdownFiles();
		
		// 결과 저장 변서
		const embededDatas: EmbededData[] = [];

		// 순회하며 임베딩
		for (const file of markdownFiles) {
			const content = await this.app.vault.cachedRead(file);
			const filePath = file.path;

			const embededContents = await generateEmbeddingsForMarkdown(this.embedModel, content, filePath) as EmbededData[];
			
			embededDatas.push(...embededContents);
		}
	
		// 임베딩 결과 저장
		this.appendToCache(embededDatas);
	}

	async startIndexing() {
		// 전체 파일 스캔 및 인덱싱 로직
		new Notice("첨사: 인덱싱을 시작합니다...");
		this.embedAllFiles();
		new Notice("첨사: 인덱싱을 종료합니다...");
	}

	/**
     * 생성된 임베딩 데이터 배열을 플러그인 폴더 내의 JSON 파일로 저장(덮어쓰기)합니다.
     * @param data 저장할 임베딩 데이터 배열
     */
	async appendToCache(newDatas: EmbededData[]) {
		const savingPath = normalizePath(`${this.manifest.dir}/embeddings.json`);

		await this.app.vault.adapter.write(savingPath, JSON.stringify(newDatas, null, 2));
		console.log(`${newDatas.length}개의 임베딩 데이터가 캐시에 추가됨.`);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async testHNSWLibAdapterRoundTrip() {
        console.log("--- HNSWLibAdapter Round Trip 테스트 시작 ---");
        new Notice("Adapter 테스트를 시작합니다. (콘솔 확인)");

        const DB_NAME = "test_index";
        const DIMENSIONS = 1536;
        const MAX_ELEMENTS = 1000;

        // --- 1단계: 초기화 (새 인덱스 생성) ---
        const adapter1 = new HNSWLibAdapter(this.app);
        await adapter1.initialize(DB_NAME, DIMENSIONS, MAX_ELEMENTS);
        console.log("1. 새로운 어댑터 초기화 완료.");
        
        // --- 2단계: 데이터 추가 ---
        // [수정] 제공된 createMockData 함수를 사용하여 테스트 데이터를 생성합니다.
        const mockData: VectorData[] = createMockData(10, DIMENSIONS);
        await adapter1.addItem(mockData);
        const countBeforeSave = await adapter1.count();
        console.log(`2. 목 데이터 ${countBeforeSave}개 추가 완료.`);
        
        // --- 3단계: 검색 (저장 전) ---
        const queryVector = mockData[0].vector;
        const resultsBeforeSave = await adapter1.search(queryVector, 3);
        console.log("3. 저장 전 검색 결과:", resultsBeforeSave.map(r => ({id: r.id, score: r.score})));
        
        // --- 4단계: 저장 ---
        await adapter1.save();
        console.log("4. 인덱스 및 맵 데이터 저장 완료.");

        // --- 5단계: 초기화 (기존 인덱스 로드) ---
        console.log("\n--- 새로운 어댑터 인스턴스로 데이터 로드 테스트 ---");
        const adapter2 = new HNSWLibAdapter(this.app);
        await adapter2.initialize(DB_NAME, DIMENSIONS, MAX_ELEMENTS);
        console.log("5. 기존 데이터로 어댑터 초기화 완료.");

        // --- 6단계: 개수 확인 (로드 후) ---
        const countAfterLoad = await adapter2.count();
        console.log(`6. 로드 후 아이템 개수: ${countAfterLoad}개 (저장 전: ${countBeforeSave}개)`);
        if (countBeforeSave !== countAfterLoad) {
            console.error("🚨 테스트 실패: 저장 전과 후의 아이템 개수가 다릅니다!");
            return;
        }

        // --- 7단계: 검색 (로드 후) ---
        const resultsAfterLoad = await adapter2.search(queryVector, 3);
        console.log("7. 로드 후 검색 결과:", resultsAfterLoad.map(r => ({id: r.id, score: r.score})));
        if (resultsBeforeSave[0].id !== resultsAfterLoad[0].id) {
             console.error("🚨 테스트 실패: 저장 전과 후의 검색 결과가 다릅니다!");
             return;
        }
        
        // --- 8단계: 초기화 (리셋) ---
        await adapter2.resetIndex(MAX_ELEMENTS, DIMENSIONS); // reset 함수에도 maxElements 전달
        const countAfterReset = await adapter2.count();
        console.log(`8. 인덱스 리셋 완료. 리셋 후 아이템 개수: ${countAfterReset}개`);

        new Notice("Adapter 테스트를 성공적으로 완료했습니다!");
        console.log("--- HNSWLibAdapter Round Trip 테스트 성공 ---");
    }
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}

