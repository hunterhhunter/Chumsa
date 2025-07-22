import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, setIcon, normalizePath } from 'obsidian';
import { SmartEmbedModel } from 'smart-embed-model';
import { SmartEmbedOpenAIAdapter } from 'smart-embed-model/adapters/openai';
import { generateEmbeddingsForMarkdown} from './generateEmbeddingsForMarkdown';
import { EmbededData, VectorData } from './structures';
import { HNSWLibAdapter } from './hnswAdapter';

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

		// TODO: 벡터DB 어댑터 테스트
		this.vectorDB = new HNSWLibAdapter();
		this.vectorDB.initialize('saved_index', 1536, 10000);
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

	async saveMaps() {
		const idToLabel = this.vectorDB.getIdToLabelMap();
		const labelToId = this.vectorDB.getLabelToIdMap();
		const vectorDataMap = this.vectorDB.getVectorDataMap();

		const saveIdToLabel = JSON.stringify(Object.fromEntries(idToLabel));
		const saveLabelToId = JSON.stringify(Object.fromEntries(labelToId));
		const saveVectorDataMap = JSON.stringify(Object.fromEntries(vectorDataMap));

		await this.app.vault.adapter.write(normalizePath(`${this.manifest.dir}/ID_TO_LABEL_MAP.json`), saveIdToLabel);
		await this.app.vault.adapter.write(normalizePath(`${this.manifest.dir}/LABEL_TO_ID_MAP.json`), saveLabelToId);
		await this.app.vault.adapter.write(normalizePath(`${this.manifest.dir}/VECTOR_DATA_MAP.json`), saveVectorDataMap);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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

