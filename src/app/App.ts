import type {
  DroppedFileMap,
  LoadedRobotResult,
  MotionClip,
  ViewMode,
  ViewerState,
} from '../types/viewer';
import { dataTransferToFileMap, fileListToFileMap } from '../io/drop/dataTransferToFileMap';
import { registerDropHandlers } from '../io/drop/registerDropHandlers';
import { CsvMotionService } from '../io/motion/CsvMotionService';
import { UrdfLoadService } from '../io/urdf/UrdfLoadService';
import { G1MotionPlayer, type MotionFrameSnapshot } from '../motion/G1MotionPlayer';
import { SceneController } from '../viewer/SceneController';
import { getStateCopy } from './state';

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Required element not found: #${id}`);
  }

  return element as T;
}

export class AppController {
  private readonly appRoot: HTMLDivElement;
  private readonly sceneController: SceneController;
  private readonly urdfLoadService: UrdfLoadService;
  private readonly csvMotionService: CsvMotionService;
  private readonly motionPlayer: G1MotionPlayer;
  private readonly dropHint: HTMLParagraphElement;
  private readonly stateChip: HTMLSpanElement;
  private readonly statusTitle: HTMLElement;
  private readonly statusDetail: HTMLParagraphElement;
  private readonly statusWarnings: HTMLUListElement;
  private readonly urdfListSection: HTMLElement;
  private readonly urdfList: HTMLUListElement;
  private readonly showVisualButton: HTMLButtonElement;
  private readonly showCollisionButton: HTMLButtonElement;
  private readonly motionControlsSection: HTMLElement;
  private readonly motionPlayButton: HTMLButtonElement;
  private readonly motionResetButton: HTMLButtonElement;
  private readonly motionFrameSlider: HTMLInputElement;
  private readonly motionFrameLabel: HTMLSpanElement;
  private readonly motionName: HTMLParagraphElement;
  private readonly shortcutViewModeValue: HTMLSpanElement;
  private readonly folderInput: HTMLInputElement;
  private readonly fileInput: HTMLInputElement;
  private readonly pickFolderButton: HTMLButtonElement;
  private readonly pickFilesButton: HTMLButtonElement;
  private readonly resetButton: HTMLButtonElement;
  private readonly removeDropHandlers: () => void;
  private viewerState: ViewerState = 'idle';
  private titleOverride: string | null = null;
  private detailOverride: string | null = null;
  private warnings: string[] = [];
  private sceneWarning: string | null = null;
  private droppedFileMap: DroppedFileMap | null = null;
  private availableUrdfPaths: string[] = [];
  private selectedUrdfPath: string | null = null;
  private showVisual = true;
  private showCollision = false;
  private lastLoadResult: LoadedRobotResult | null = null;
  private currentMotionClip: MotionClip | null = null;
  private currentMotionSourcePath: string | null = null;
  private motionWarnings: string[] = [];
  private motionFrameSnapshot: MotionFrameSnapshot | null = null;
  private isMotionPlaying = false;
  private viewMode: ViewMode = 'free';

  private readonly onWindowResize = (): void => {
    this.sceneController.resize();
  };

  private readonly onWindowKeyDown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing || event.repeat) {
      return;
    }

    const eventTarget = event.target as HTMLElement | null;
    if (
      eventTarget?.tagName === 'INPUT' ||
      eventTarget?.tagName === 'TEXTAREA' ||
      eventTarget?.isContentEditable
    ) {
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      this.toggleViewMode();
      return;
    }

    if (event.code === 'Space' && this.currentMotionClip) {
      event.preventDefault();
      if (this.isMotionPlaying) {
        this.motionPlayer.pause();
      } else {
        this.motionPlayer.play();
      }
      return;
    }

    if ((event.key === 'r' || event.key === 'R') && this.currentMotionClip) {
      event.preventDefault();
      this.motionPlayer.reset();
    }
  };

  private readonly onFolderInputChange = (): void => {
    void this.handlePickedFiles(this.folderInput.files);
  };

  private readonly onFileInputChange = (): void => {
    void this.handlePickedFiles(this.fileInput.files);
  };

  private readonly onPickFolderClick = (): void => {
    this.folderInput.value = '';
    this.folderInput.click();
  };

  private readonly onPickFilesClick = (): void => {
    this.fileInput.value = '';
    this.fileInput.click();
  };

  private readonly onResetClick = (): void => {
    this.resetViewer();
  };

  private readonly onShowVisualClick = (): void => {
    this.showVisual = !this.showVisual;
    this.sceneController.setGeometryVisibility(this.showVisual, this.showCollision);
    this.syncVisibilityButtons();
  };

  private readonly onShowCollisionClick = (): void => {
    this.showCollision = !this.showCollision;
    this.sceneController.setGeometryVisibility(this.showVisual, this.showCollision);
    this.syncVisibilityButtons();
  };

  private readonly onUrdfListClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>('button[data-urdf-path]');
    if (!button) {
      return;
    }

    const urdfPath = button.dataset.urdfPath;
    if (!urdfPath || urdfPath === this.selectedUrdfPath) {
      return;
    }

    void this.loadSelectedUrdf(urdfPath);
  };

  private readonly onMotionPlayClick = (): void => {
    if (!this.currentMotionClip) {
      return;
    }

    if (this.isMotionPlaying) {
      this.motionPlayer.pause();
      return;
    }

    this.motionPlayer.play();
  };

  private readonly onMotionResetClick = (): void => {
    if (!this.currentMotionClip) {
      return;
    }

    this.motionPlayer.reset();
  };

  private readonly onMotionFrameInput = (): void => {
    if (!this.currentMotionClip) {
      return;
    }

    const frameIndex = Number(this.motionFrameSlider.value);
    if (!Number.isFinite(frameIndex)) {
      return;
    }

    this.motionPlayer.seek(frameIndex);
  };

  constructor() {
    this.appRoot = requireElement<HTMLDivElement>('app');
    const canvas = requireElement<HTMLCanvasElement>('viewer-canvas');
    this.dropHint = requireElement<HTMLParagraphElement>('drop-hint');
    this.stateChip = requireElement<HTMLSpanElement>('state-chip');
    this.statusTitle = requireElement<HTMLElement>('status-title');
    this.statusDetail = requireElement<HTMLParagraphElement>('status-detail');
    this.statusWarnings = requireElement<HTMLUListElement>('status-warnings');
    this.urdfListSection = requireElement<HTMLElement>('urdf-list-section');
    this.urdfList = requireElement<HTMLUListElement>('urdf-list');
    this.showVisualButton = requireElement<HTMLButtonElement>('show-visual-btn');
    this.showCollisionButton = requireElement<HTMLButtonElement>('show-collision-btn');
    this.motionControlsSection = requireElement<HTMLElement>('motion-controls-section');
    this.motionPlayButton = requireElement<HTMLButtonElement>('motion-play-btn');
    this.motionResetButton = requireElement<HTMLButtonElement>('motion-reset-btn');
    this.motionFrameSlider = requireElement<HTMLInputElement>('motion-frame-slider');
    this.motionFrameLabel = requireElement<HTMLSpanElement>('motion-frame-label');
    this.motionName = requireElement<HTMLParagraphElement>('motion-name');
    this.shortcutViewModeValue = requireElement<HTMLSpanElement>('shortcut-view-mode');
    this.folderInput = requireElement<HTMLInputElement>('folder-input');
    this.fileInput = requireElement<HTMLInputElement>('file-input');
    this.pickFolderButton = requireElement<HTMLButtonElement>('pick-folder-btn');
    this.pickFilesButton = requireElement<HTMLButtonElement>('pick-files-btn');
    this.resetButton = requireElement<HTMLButtonElement>('reset-btn');

    this.sceneController = new SceneController(canvas);
    this.sceneController.setModelUpAxis('+Z');
    this.sceneController.setViewMode(this.viewMode);
    this.sceneController.onViewWarning = (warning) => {
      this.sceneWarning = warning;
      if (this.viewerState === 'ready' && this.lastLoadResult) {
        this.renderReadyState(this.lastLoadResult);
      }
    };

    this.urdfLoadService = new UrdfLoadService();
    this.csvMotionService = new CsvMotionService();
    this.motionPlayer = new G1MotionPlayer();
    this.motionPlayer.onFrameChanged = (snapshot) => {
      this.motionFrameSnapshot = snapshot;
      this.syncMotionControls();
      this.sceneController.syncGroundToCurrentRobot();
      this.sceneController.syncViewToCurrentRobot();
    };
    this.motionPlayer.onPlaybackStateChanged = (isPlaying) => {
      this.isMotionPlaying = isPlaying;
      this.syncMotionControls();
      if (this.lastLoadResult && this.viewerState === 'ready') {
        this.renderReadyState(this.lastLoadResult);
      }
    };
    this.motionPlayer.onWarning = (warning) => {
      if (!this.motionWarnings.includes(warning)) {
        this.motionWarnings.push(warning);
      }

      if (this.lastLoadResult && this.viewerState === 'ready') {
        this.renderReadyState(this.lastLoadResult);
      }
    };

    this.removeDropHandlers = registerDropHandlers(document, {
      onDrop: (dataTransfer) => this.handleDrop(dataTransfer),
      onDragStateChange: (isDragging) => this.handleDragStateChange(isDragging),
    });

    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('keydown', this.onWindowKeyDown);
    this.folderInput.addEventListener('change', this.onFolderInputChange);
    this.fileInput.addEventListener('change', this.onFileInputChange);
    this.pickFolderButton.addEventListener('click', this.onPickFolderClick);
    this.pickFilesButton.addEventListener('click', this.onPickFilesClick);
    this.resetButton.addEventListener('click', this.onResetClick);
    this.showVisualButton.addEventListener('click', this.onShowVisualClick);
    this.showCollisionButton.addEventListener('click', this.onShowCollisionClick);
    this.urdfList.addEventListener('click', this.onUrdfListClick);
    this.motionPlayButton.addEventListener('click', this.onMotionPlayClick);
    this.motionResetButton.addEventListener('click', this.onMotionResetClick);
    this.motionFrameSlider.addEventListener('input', this.onMotionFrameInput);

    this.syncVisibilityButtons();
    this.syncMotionControls();
    this.syncShortcutPanel();
    this.renderState();
  }

  async handleDrop(dataTransfer: DataTransfer): Promise<void> {
    const fileMap = await dataTransferToFileMap(dataTransfer);
    await this.handleDroppedFileMap(fileMap);
  }

  resetViewer(): void {
    this.droppedFileMap = null;
    this.availableUrdfPaths = [];
    this.selectedUrdfPath = null;
    this.lastLoadResult = null;
    this.sceneWarning = null;
    this.urdfLoadService.dispose();
    this.sceneController.clearRobot();
    this.motionPlayer.attachRobot(null);
    this.clearMotionPlayback();
    this.renderUrdfList();
    this.setState('idle');
  }

  dispose(): void {
    this.removeDropHandlers();
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('keydown', this.onWindowKeyDown);
    this.folderInput.removeEventListener('change', this.onFolderInputChange);
    this.fileInput.removeEventListener('change', this.onFileInputChange);
    this.pickFolderButton.removeEventListener('click', this.onPickFolderClick);
    this.pickFilesButton.removeEventListener('click', this.onPickFilesClick);
    this.resetButton.removeEventListener('click', this.onResetClick);
    this.showVisualButton.removeEventListener('click', this.onShowVisualClick);
    this.showCollisionButton.removeEventListener('click', this.onShowCollisionClick);
    this.urdfList.removeEventListener('click', this.onUrdfListClick);
    this.motionPlayButton.removeEventListener('click', this.onMotionPlayClick);
    this.motionResetButton.removeEventListener('click', this.onMotionResetClick);
    this.motionFrameSlider.removeEventListener('input', this.onMotionFrameInput);

    this.urdfLoadService.dispose();
    this.motionPlayer.dispose();
    this.sceneController.dispose();
  }

  private async handlePickedFiles(fileList: FileList | null): Promise<void> {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const fileMap = fileListToFileMap(Array.from(fileList));
    await this.handleDroppedFileMap(fileMap);
  }

  private async handleDroppedFileMap(fileMap: DroppedFileMap): Promise<void> {
    if (fileMap.size === 0) {
      this.setState('error', {
        title: 'No Files Found',
        detail: 'Drop payload did not contain files. Try selecting a folder or file set again.',
      });
      return;
    }

    const urdfPaths = this.urdfLoadService.getAvailableUrdfPaths(fileMap);
    if (urdfPaths.length > 0) {
      this.droppedFileMap = fileMap;
      this.availableUrdfPaths = urdfPaths;
      this.selectedUrdfPath = urdfPaths[0] ?? null;
      this.renderUrdfList();

      if (!this.selectedUrdfPath) {
        this.setState('error', {
          title: 'No URDF Found',
          detail: 'Dropped files do not contain .urdf models.',
        });
        return;
      }

      await this.loadSelectedUrdf(this.selectedUrdfPath);
      return;
    }

    const csvPaths = this.csvMotionService.getAvailableCsvPaths(fileMap);
    if (csvPaths.length > 0) {
      await this.loadMotionFromDroppedFiles(fileMap);
      return;
    }

    this.setState('error', {
      title: 'No Supported Files',
      detail: 'Drop URDF files or a motion CSV file.',
    });
  }

  private async loadSelectedUrdf(urdfPath: string): Promise<void> {
    if (!this.droppedFileMap) {
      return;
    }

    this.lastLoadResult = null;
    this.sceneWarning = null;
    this.selectedUrdfPath = urdfPath;
    this.renderUrdfList();
    this.sceneController.clearRobot();
    this.clearMotionPlayback();
    this.setState('loading', {
      detail: `Loading ${urdfPath} ...`,
    });

    try {
      const result = await this.urdfLoadService.loadFromDroppedFiles(this.droppedFileMap, urdfPath);
      this.sceneController.setRobot(result.robot);
      this.sceneController.setGeometryVisibility(this.showVisual, this.showCollision);
      this.motionPlayer.attachRobot(result.robot);
      this.lastLoadResult = result;
      this.selectedUrdfPath = result.selectedUrdfPath;
      this.renderUrdfList();
      this.renderReadyState(result);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.setState('error', {
        title: 'Load Failed',
        detail: reason,
      });
    }
  }

  private async loadMotionFromDroppedFiles(fileMap: DroppedFileMap): Promise<void> {
    const loadedRobotResult = this.lastLoadResult;
    if (!loadedRobotResult) {
      this.setState('error', {
        title: 'No Robot Loaded',
        detail: 'Load a URDF robot before dropping CSV motion.',
      });
      return;
    }

    this.setState('loading', {
      detail: 'Loading motion CSV ...',
    });

    try {
      const result = await this.csvMotionService.loadFromDroppedFiles(
        fileMap,
        loadedRobotResult.motionSchema,
      );
      this.motionPlayer.attachRobot(loadedRobotResult.robot);
      const bindingReport = this.motionPlayer.loadClip(result.clip);

      this.currentMotionClip = result.clip;
      this.currentMotionSourcePath = result.selectedCsvPath;
      this.motionWarnings = [...result.warnings];
      if (bindingReport.missingRootJoint) {
        this.motionWarnings.push(
          `Joint "${result.clip.schema.rootJointName}" was not found. Root translation/rotation is ignored.`,
        );
      }

      this.motionFrameSnapshot = {
        frameIndex: 0,
        frameCount: result.clip.frameCount,
        fps: result.clip.fps,
        timeSeconds: 0,
      };
      this.motionPlayer.play();
      this.syncMotionControls();
      this.renderReadyState(loadedRobotResult);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.setState('error', {
        title: 'Motion Load Failed',
        detail: reason,
      });
    }
  }

  private clearMotionPlayback(): void {
    this.motionPlayer.pause();
    this.motionPlayer.loadClip(null);
    this.currentMotionClip = null;
    this.currentMotionSourcePath = null;
    this.motionWarnings = [];
    this.motionFrameSnapshot = null;
    this.isMotionPlaying = false;
    this.syncMotionControls();
  }

  private handleDragStateChange(isDragging: boolean): void {
    if (this.viewerState === 'loading') {
      return;
    }

    if (isDragging) {
      this.setState('drag_over');
      return;
    }

    if (this.lastLoadResult) {
      this.renderReadyState(this.lastLoadResult);
      return;
    }

    this.setState('idle');
  }

  private setState(
    state: ViewerState,
    overrides: {
      title?: string;
      detail?: string;
      warnings?: string[];
    } = {},
  ): void {
    this.viewerState = state;
    this.titleOverride = overrides.title ?? null;
    this.detailOverride = overrides.detail ?? null;
    this.warnings = overrides.warnings ? [...overrides.warnings] : [];
    this.renderState();
  }

  private renderState(): void {
    const copy = getStateCopy(this.viewerState);
    this.appRoot.dataset.viewerState = this.viewerState;
    this.stateChip.textContent = copy.chip;
    this.statusTitle.textContent = this.titleOverride ?? copy.title;
    this.statusDetail.textContent = this.detailOverride ?? copy.detail;
    this.dropHint.textContent = copy.dropHint;

    this.statusWarnings.innerHTML = '';
    for (const warning of this.warnings) {
      const item = document.createElement('li');
      item.textContent = warning;
      this.statusWarnings.appendChild(item);
    }
  }

  private renderReadyState(result: LoadedRobotResult): void {
    const motionDetail = this.currentMotionClip
      ? ` Motion: ${this.currentMotionClip.name} (${this.currentMotionClip.frameCount} frames @ ${this.currentMotionClip.fps} FPS, ${this.isMotionPlaying ? 'playing' : 'paused'}). Drop CSV to replace motion.`
      : ' Drop CSV to load motion.';

    const sourceDetail = this.currentMotionSourcePath
      ? ` Motion source: ${this.currentMotionSourcePath}.`
      : '';
    const viewModeDetail =
      this.viewMode === 'root_lock'
        ? ' View mode: root lock (press Tab to switch).'
        : ' View mode: free (press Tab to switch).';

    this.setState('ready', {
      title: `Loaded ${result.robotName || 'URDF Robot'}`,
      detail: `${result.jointCount} joints, ${result.linkCount} links, source: ${result.selectedUrdfPath}. Drop URDF to replace robot.${motionDetail}${sourceDetail}${viewModeDetail}`,
      warnings: this.collectReadyWarnings(result.warnings),
    });
  }

  private collectReadyWarnings(robotWarnings: string[]): string[] {
    const merged = new Set<string>(robotWarnings);
    for (const warning of this.motionWarnings) {
      merged.add(warning);
    }

    if (this.sceneWarning) {
      merged.add(this.sceneWarning);
    }

    return [...merged];
  }

  private syncVisibilityButtons(): void {
    this.showVisualButton.classList.toggle('active', this.showVisual);
    this.showCollisionButton.classList.toggle('active', this.showCollision);
  }

  private syncMotionControls(): void {
    const hasMotion = Boolean(this.currentMotionClip);
    this.motionControlsSection.hidden = !hasMotion;
    this.motionPlayButton.disabled = !hasMotion;
    this.motionResetButton.disabled = !hasMotion;

    if (!hasMotion || !this.currentMotionClip) {
      this.motionPlayButton.textContent = 'Play';
      this.motionPlayButton.classList.remove('active');
      this.motionFrameSlider.min = '0';
      this.motionFrameSlider.max = '0';
      this.motionFrameSlider.value = '0';
      this.motionFrameLabel.textContent = 'Frame 0 / 0';
      this.motionName.textContent = 'No motion loaded';
      return;
    }

    this.motionPlayButton.textContent = this.isMotionPlaying ? 'Pause' : 'Play';
    this.motionPlayButton.classList.toggle('active', this.isMotionPlaying);

    const snapshot =
      this.motionFrameSnapshot ??
      ({
        frameIndex: 0,
        frameCount: this.currentMotionClip.frameCount,
        fps: this.currentMotionClip.fps,
        timeSeconds: 0,
      } as MotionFrameSnapshot);

    const maxFrame = Math.max(snapshot.frameCount - 1, 0);
    this.motionFrameSlider.min = '0';
    this.motionFrameSlider.max = String(maxFrame);
    this.motionFrameSlider.step = '1';
    this.motionFrameSlider.value = String(snapshot.frameIndex);
    this.motionFrameLabel.textContent = `Frame ${snapshot.frameIndex + 1} / ${snapshot.frameCount}`;
    const jointCount = this.currentMotionClip.schema.jointNames.length;
    this.motionName.textContent = `${this.currentMotionClip.name} · ${this.currentMotionClip.fps} FPS · ${this.currentMotionClip.sourceColumnCount} src cols -> ${this.currentMotionClip.stride} mapped cols (${jointCount} joints + root, ${this.currentMotionClip.csvMode})`;
  }

  private toggleViewMode(): void {
    this.viewMode = this.viewMode === 'free' ? 'root_lock' : 'free';
    this.sceneController.setViewMode(this.viewMode);
    this.syncShortcutPanel();

    if (this.lastLoadResult && this.viewerState === 'ready') {
      this.renderReadyState(this.lastLoadResult);
    }
  }

  private syncShortcutPanel(): void {
    this.shortcutViewModeValue.textContent =
      this.viewMode === 'root_lock' ? 'View: Root Lock' : 'View: Free';
  }

  private renderUrdfList(): void {
    const showList = this.availableUrdfPaths.length > 1;
    this.urdfListSection.hidden = !showList;
    this.urdfList.innerHTML = '';

    if (!showList) {
      return;
    }

    for (const urdfPath of this.availableUrdfPaths) {
      const listItem = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.urdfPath = urdfPath;
      button.textContent = urdfPath;
      button.title = urdfPath;
      button.classList.toggle('active', urdfPath === this.selectedUrdfPath);
      listItem.appendChild(button);
      this.urdfList.appendChild(listItem);
    }
  }
}
