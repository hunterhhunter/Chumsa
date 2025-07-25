import { ItemView, WorkspaceLeaf } from "obsidian";
import { SearchResult } from "./structures";

export const MY_VIEW_TYPE = "my-plugin-side-view";

export class MySideView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return MY_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "첨사 검색 결과";
    }

    async onOpen(): Promise<void> {
        // [수정] 뷰가 열릴 때, 뷰의 루트 컨테이너에 클래스를 추가합니다.
        // 이것이 CSS가 적용될 기준점이 됩니다.
        this.containerEl.addClass('chumsa-side-view');
        
        const container = this.contentEl;
        container.empty();
        container.createEl("h4", { text: "관련 노트를 찾아보세요." });
    }

    async onClose(): Promise<void> {
        // Nothing to clean up.
    }

    updateContent(results: SearchResult[]) {
        const container = this.contentEl;
        container.empty();

        if (results.length === 0) {
            container.createEl("p", { text: "관련된 내용이 없습니다." });
            return;
        }

        for (const result of results) {
            const div = container.createEl("div", { cls: "search-result-item" });
            
            div.createEl("h5", { text: result.metadata.filePath });
            
            const p = div.createEl("p");
            p.createEl("strong", { text: `유사도: ${Math.round(result.score * 100)}%` });
            p.appendText(` — ${result.metadata.text.substring(0, 100)}...`);
        }
    }
}