import './landing.css';
import landingData from './landingData.json';

interface LandingState {
  currentLang: 'vi' | 'en';
  activeClassId: string;
  classGender: 'male' | 'female';
  heroGender: 'male' | 'female';
  heroClassIdx: number;
  activeSkillFilter: string;
  activeRegionId: string;
  mobileMenuOpen: boolean;
  activeModal: 'skill' | 'lightbox' | null;
  activeSkillData: any;
  lightboxImgUrl: string;
  lightboxCaption: string;
}

const state: LandingState = {
  currentLang: 'vi',
  activeClassId: 'swordsman',
  classGender: 'male',
  heroGender: 'male',
  heroClassIdx: 0,
  activeSkillFilter: 'all',
  activeRegionId: 'THON_KHOI_NGUYEN',
  mobileMenuOpen: false,
  activeModal: null,
  activeSkillData: null,
  lightboxImgUrl: '',
  lightboxCaption: '',
};

export class ElysiaLandingPage {
  private container: HTMLElement;
  private particleCanvas: HTMLCanvasElement | null = null;
  private animFrameId: number | null = null;
  private onLaunchGameCallback?: () => void;
  private onOpenAuthCallback?: (tab?: 'login' | 'register') => void;

  constructor(
    options?: {
      onLaunchGame?: () => void;
      onOpenAuth?: (tab?: 'login' | 'register') => void;
    }
  ) {
    this.onLaunchGameCallback = options?.onLaunchGame;
    this.onOpenAuthCallback = options?.onOpenAuth;
    this.container = document.createElement('div');
    this.container.id = 'elysia-landing-app';
    this.container.className = 'elysia-landing-root';
  }

  public render(target: HTMLElement) {
    this.container.innerHTML = this.buildHtml();
    target.appendChild(this.container);
    this.bindEvents();
    this.initHeroParticles();
    this.initScrollReveal();
  }

  public destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.container.remove();
  }

  private buildHtml(): string {
    return `
      ${this.renderHeader()}
      ${this.renderHero()}
      ${this.renderStory()}
      ${this.renderClasses()}
      ${this.renderSkills()}
      ${this.renderWorldMap()}
      ${this.renderGameplay()}
      ${this.renderBosses()}
      ${this.renderEquipment()}
      ${this.renderGallery()}
      ${this.renderNews()}
      ${this.renderFooter()}
      ${this.renderModals()}
    `;
  }

  // ==========================================
  // 3.1 HEADER
  // ==========================================
  private renderHeader(): string {
    return `
      <header class="elysia-nav-header" id="navbar">
        <a href="#hero" class="elysia-nav-brand">
          <svg class="elysia-brand-icon" viewBox="0 0 48 48" fill="none">
            <polygon points="24,2 44,14 44,34 24,46 4,34 4,14" stroke="#f59e0b" stroke-width="2" fill="rgba(6,182,212,0.2)"/>
            <polygon points="24,8 38,18 38,30 24,40 10,30 10,18" fill="url(#cyanGlow)"/>
            <defs>
              <linearGradient id="cyanGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#22d3ee"/>
                <stop offset="100%" stop-color="#0284c7"/>
              </linearGradient>
            </defs>
          </svg>
          <div class="elysia-brand-text">
            <span class="elysia-brand-title">ELYSIA NO DENSETSU</span>
            <span class="elysia-brand-sub">Elysia Frontier</span>
          </div>
        </a>

        <ul class="elysia-nav-links" id="nav-links">
          <li><a href="#hero" class="nav-link">Trang Chủ</a></li>
          <li><a href="#story" class="nav-link">Cốt Truyện</a></li>
          <li><a href="#classes" class="nav-link">Nghề Nghiệp</a></li>
          <li><a href="#skills" class="nav-link">Kỹ Năng</a></li>
          <li><a href="#world" class="nav-link">Thế Giới</a></li>
          <li><a href="#gameplay" class="nav-link">Lối Chơi</a></li>
          <li><a href="#bosses" class="nav-link">Boss</a></li>
          <li><a href="#gallery" class="nav-link">Thư Viện</a></li>
        </ul>

        <div class="elysia-nav-actions">
          <button class="elysia-lang-toggle" id="btn-lang-toggle">VI / EN</button>
          <button class="btn-elysia-ghost" id="btn-nav-login">Đăng Nhập</button>
          <button class="btn-elysia-primary" id="btn-nav-play">Chơi Ngay</button>
          <button class="elysia-mobile-toggle" id="btn-mobile-toggle" aria-label="Menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>
    `;
  }

  // ==========================================
  // 3.2 HERO SECTION
  // ==========================================
  private renderHero(): string {
    const activeHeroJob = landingData.jobs[state.heroClassIdx] || landingData.jobs[0];
    const heroImg = state.heroGender === 'male' ? activeHeroJob.maleImg : activeHeroJob.femaleImg;

    return `
      <section class="elysia-hero-section" id="hero">
        <canvas class="elysia-hero-canvas-particles" id="hero-particles"></canvas>
        <div class="elysia-hero-vignette"></div>

        <div class="elysia-hero-container">
          <div class="elysia-hero-content">
            <div class="elysia-hero-badge">
              <span>✦ MMORPG Anime Nhật Bản 2.5D</span>
            </div>
            <h1 class="elysia-hero-title gold-gradient-text">ELYSIA NO DENSETSU</h1>
            <div class="elysia-hero-slogan">Become Wibu, Save the Worlds.</div>
            <p class="elysia-hero-desc">
              Bước vào lục địa huyền thoại Elysia, đánh thức thiên mệnh, rèn luyện 8 chức nghiệp tinh hoa, 
              thăng hoa 16 nhánh chuyển chức tối thượng và sát cánh cùng hàng ngàn dũng giả giải cứu thế giới!
            </p>

            <div class="elysia-hero-cta-group">
              <button class="btn-elysia-primary" id="btn-hero-play">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Chơi Ngay Miễn Phí
              </button>
              <a href="#classes" class="btn-elysia-secondary">Khám Phá Chức Nghiệp</a>
              <a href="#world" class="btn-elysia-ghost">Bản Đồ Thế Giới</a>
            </div>

            <div class="elysia-hero-stats-bar">
              <div class="hero-stat-item">
                <span class="hero-stat-val gold-gradient-text">8</span>
                <span class="hero-stat-lbl">Chức Nghiệp Khởi Đầu</span>
              </div>
              <div class="hero-stat-item">
                <span class="hero-stat-val cyan-gradient-text">16</span>
                <span class="hero-stat-lbl">Nhánh Tiến Hóa Cấp 80</span>
              </div>
              <div class="hero-stat-item">
                <span class="hero-stat-val gold-gradient-text">80+</span>
                <span class="hero-stat-lbl">Chủng Loài Quái Vật</span>
              </div>
              <div class="hero-stat-item">
                <span class="hero-stat-val cyan-gradient-text">25</span>
                <span class="hero-stat-lbl">Bản Đồ &amp; Đô Thị</span>
              </div>
            </div>
          </div>

          <div class="elysia-hero-showcase">
            <div class="hero-character-portal">
              <div class="hero-crystal-halo"></div>
              <img src="${heroImg}" alt="${activeHeroJob.nameVi}" class="hero-character-img" id="hero-char-img" />
            </div>

            <div class="hero-switcher-box">
              <span class="hero-class-label">${activeHeroJob.nameVi} (${activeHeroJob.nameEn})</span>
              <button class="hero-gender-btn ${state.heroGender === 'male' ? 'active' : ''}" data-hero-gender="male">Nam</button>
              <button class="hero-gender-btn ${state.heroGender === 'female' ? 'active' : ''}" data-hero-gender="female">Nữ</button>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // ==========================================
  // 3.3 STORY CHAPTERS
  // ==========================================
  private renderStory(): string {
    return `
      <section class="elysia-section" id="story">
        <div class="section-header">
          <span class="section-pre-title">Huyền Thoại Khởi Sinh</span>
          <h2 class="section-title gold-gradient-text">Biên Niên Sử Elysia</h2>
          <p class="section-desc">Hành trình trưởng thành từ một Nhà Thám Hiểm vô danh đến đỉnh cao Huyền Thoại cứu rỗi lục địa.</p>
        </div>

        <div class="story-timeline-grid">
          <div class="story-card">
            <div class="story-card-number">01</div>
            <div class="story-card-chapter">Chương I</div>
            <h3 class="story-card-title">Thôn Khởi Nguyên</h3>
            <p class="story-card-text">
              Thức tỉnh bên dòng suối thanh bình, dưới sự chỉ dẫn của Trưởng Thôn Kiên và Thánh Nữ Aria, 
              rèn giũa kỹ năng sơ khởi chống lại đàn Slime và Thỏ Rừng quấy phá.
            </p>
          </div>

          <div class="story-card">
            <div class="story-card-number">02</div>
            <div class="story-card-chapter">Chương II</div>
            <h3 class="story-card-title">Thánh Điện Thức Tỉnh</h3>
            <p class="story-card-text">
              Vượt qua 3 tầng cổ đại của Sanctum of Awakening ở cấp độ 15. Đối mặt với Hộ Vệ Thức Tỉnh để 
              chứng minh tư chất và thức tỉnh 1 trong 8 Chức Nghiệp chính thức.
            </p>
          </div>

          <div class="story-card">
            <div class="story-card-number">03</div>
            <div class="story-card-chapter">Chương III</div>
            <h3 class="story-card-title">Rừng Sâu Tinh Linh</h3>
            <p class="story-card-text">
              Dấu vết tiến hóa hắc ám của chủng Goblin cổ bùng phát. Hành trình giải cứu Mộc Thần Cổ Thụ 
              và mở khóa Cường Hóa Thạch tại Thánh Thành Sylvaris.
            </p>
          </div>

          <div class="story-card">
            <div class="story-card-number">04</div>
            <div class="story-card-chapter">Chương IV</div>
            <h3 class="story-card-title">Hỏa Long Thí Luyện</h3>
            <p class="story-card-text">
              Tiến vào hẻm núi dung nham Drakhen, tôi luyện ý chí cùng các Long Kỵ Sĩ và thu thập Vảy Rồng 
              chuẩn bị cho nghi lễ Nhị Chuyển Đăng Phong cấp 60 & 80.
            </p>
          </div>

          <div class="story-card">
            <div class="story-card-number">05</div>
            <div class="story-card-chapter">Chương V</div>
            <h3 class="story-card-title">Hư Vô Thức Tỉnh</h3>
            <p class="story-card-text">
              Vết nứt Hư Vô Giới mở toang tại ranh giới tận cùng. Hợp sức cùng liên minh người chơi toàn máy chủ 
              đánh bại Chúa Tể Hư Vô Abyss Overlord (Lv.110).
            </p>
          </div>
        </div>
      </section>
    `;
  }

  // ==========================================
  // 3.4 CLASSES SHOWCASE
  // ==========================================
  private renderClasses(): string {
    const curJob = landingData.jobs.find((j) => j.id === state.activeClassId) || landingData.jobs[0];
    const jobImg = state.classGender === 'male' ? curJob.maleImg : curJob.femaleImg;

    return `
      <section class="elysia-section" id="classes">
        <div class="section-header">
          <span class="section-pre-title">Thiên Mệnh Lựa Chọn</span>
          <h2 class="section-title gold-gradient-text">8 Chức Nghiệp Tinh Hoa</h2>
          <p class="section-desc">Mỗi hệ phái sở hữu bộ kỹ năng, phong cách chiến đấu và 2 nhánh tiến hóa cấp 80 độc nhất.</p>
        </div>

        <div class="class-showcase-container">
          <!-- Class Tabs -->
          <div class="class-list-tabs">
            ${landingData.jobs
              .map(
                (j) => `
              <div class="class-tab-item ${j.id === state.activeClassId ? 'active' : ''}" data-class-select="${j.id}">
                <span>${j.nameVi}</span>
                <small>${j.nameEn}</small>
              </div>
            `
              )
              .join('')}
          </div>

          <!-- Class Details -->
          <div class="class-detail-panel">
            <div class="class-portrait-box">
              <div class="class-portrait-frame">
                <img src="${jobImg}" alt="${curJob.nameVi}" class="class-full-img" id="class-main-img" />
              </div>
              <div class="gender-toggle-bar">
                <button class="gender-btn ${state.classGender === 'male' ? 'active' : ''}" data-job-gender="male">Nam</button>
                <button class="gender-btn ${state.classGender === 'female' ? 'active' : ''}" data-job-gender="female">Nữ</button>
              </div>
            </div>

            <div class="class-info-box">
              <div class="class-title-row">
                <h3 class="class-main-name gold-gradient-text">${curJob.nameVi}</h3>
                <span class="class-en-name">${curJob.nameEn}</span>
              </div>
              <div class="class-role-badge">${curJob.role}</div>
              <p class="class-desc-text">${curJob.description}</p>

              <!-- Base stats chips -->
              <div class="class-stats-grid">
                <div class="stat-chip">
                  <div class="stat-chip-lbl">STR</div>
                  <div class="stat-chip-val">${curJob.baseStats?.str ?? 10}</div>
                </div>
                <div class="stat-chip">
                  <div class="stat-chip-lbl">DEX</div>
                  <div class="stat-chip-val">${curJob.baseStats?.dex ?? 10}</div>
                </div>
                <div class="stat-chip">
                  <div class="stat-chip-lbl">AGI</div>
                  <div class="stat-chip-val">${curJob.baseStats?.agi ?? 10}</div>
                </div>
                <div class="stat-chip">
                  <div class="stat-chip-lbl">INT</div>
                  <div class="stat-chip-val">${curJob.baseStats?.int ?? 10}</div>
                </div>
                <div class="stat-chip">
                  <div class="stat-chip-lbl">CON</div>
                  <div class="stat-chip-val">${curJob.baseStats?.con ?? 10}</div>
                </div>
              </div>

              <!-- Advanced branches -->
              <div class="advancement-branches-box">
                <div class="adv-branches-title">2 Nhánh Tiến Hóa Cấp 80 (Advanced Jobs):</div>
                <div class="adv-branches-list">
                  ${curJob.advancedBranches
                    .map(
                      (b) => `
                    <div class="adv-branch-card" style="border-left-color: ${b.accentColor};">
                      <div class="adv-branch-name">${b.nameVi}</div>
                      <div class="adv-branch-role">${b.role}</div>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>

              <div class="class-weapons-row" style="font-size:0.85rem;color:#94a3b8;">
                <strong style="color:#fff;">Vũ khí khuyên dùng:</strong> ${(curJob.allowedWeapons || []).join(', ')}
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // ==========================================
  // 3.5 SKILLS SHOWCASE
  // ==========================================
  private renderSkills(): string {
    const filtered =
      state.activeSkillFilter === 'all'
        ? landingData.skills
        : landingData.skills.filter((s) => s.skillType === state.activeSkillFilter || s.classId === state.activeSkillFilter);

    return `
      <section class="elysia-section" id="skills">
        <div class="section-header">
          <span class="section-pre-title">Bí Thuật Chiến Đấu</span>
          <h2 class="section-title gold-gradient-text">Hệ Thống 170+ Kỹ Năng</h2>
          <p class="section-desc">Từ chiêu thức vật lý, ma pháp nguyên tố đến tuyệt kỹ Thánh Kiếm Iaido uy lực vô song.</p>
        </div>

        <div class="skills-filter-bar">
          <button class="skill-filter-btn ${state.activeSkillFilter === 'all' ? 'active' : ''}" data-skill-filter="all">Tất Cả</button>
          <button class="skill-filter-btn ${state.activeSkillFilter === 'active' ? 'active' : ''}" data-skill-filter="active">Chủ Động (Active)</button>
          <button class="skill-filter-btn ${state.activeSkillFilter === 'swordsman' ? 'active' : ''}" data-skill-filter="swordsman">Kiếm Sĩ</button>
          <button class="skill-filter-btn ${state.activeSkillFilter === 'mage' ? 'active' : ''}" data-skill-filter="mage">Pháp Sư</button>
          <button class="skill-filter-btn ${state.activeSkillFilter === 'monk' ? 'active' : ''}" data-skill-filter="monk">Tu Sĩ</button>
          <button class="skill-filter-btn ${state.activeSkillFilter === 'archer' ? 'active' : ''}" data-skill-filter="archer">Cung Thủ</button>
        </div>

        <div class="skills-cards-grid">
          ${filtered
            .map(
              (s) => `
            <div class="skill-card" data-open-skill="${s.id}">
              <div class="skill-card-top">
                <div class="skill-thumb-frame">
                  <img src="${s.iconUrl}" alt="${s.nameVi}" class="skill-thumb-img" onerror="this.src='/assets/elysia/vfx/vfx_sword_slash_thumb.png'" />
                </div>
                <div class="skill-meta">
                  <h4 class="skill-card-name">${s.nameVi}</h4>
                  <span class="skill-card-type">${s.skillType} · ${s.element || 'neutral'}</span>
                </div>
              </div>
              <p class="skill-card-desc">${s.desc}</p>
              <div class="skill-card-metrics">
                <span>Hồi chiêu: <strong>${s.cooldown}s</strong></span>
                <span>Tiêu hao: <strong>${s.mpCost} MP</strong></span>
                <span>Yêu cầu: <strong>Lv.${s.reqLevel || 1}</strong></span>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </section>
    `;
  }

  // ==========================================
  // 3.6 WORLD MAP INTERACTIVE
  // ==========================================
  private renderWorldMap(): string {
    const curReg = landingData.regions.find((r) => r.id === state.activeRegionId) || landingData.regions[0];

    return `
      <section class="elysia-section" id="world">
        <div class="section-header">
          <span class="section-pre-title">Lục Địa Rộng Lớn</span>
          <h2 class="section-title gold-gradient-text">25 Bản Đồ &amp; Đô Thị</h2>
          <p class="section-desc">Khám phá từ ngôi làng Khởi Nguyên thanh bình đến Hẻm Núi Rồng và Biên Giới Hắc Ám.</p>
        </div>

        <div class="world-map-layout">
          <!-- Left: Regions Grid Selector -->
          <div class="regions-grid-selector">
            ${landingData.regions
              .map(
                (r) => `
              <div class="region-tile ${r.id === state.activeRegionId ? 'active' : ''}" data-region-select="${r.id}">
                <div class="region-tile-title">${r.nameVi}</div>
                <div class="region-tile-lvl">Lv.${r.levelMin} – ${r.levelMax}</div>
              </div>
            `
              )
              .join('')}
          </div>

          <!-- Right: Active Region Detail -->
          <div class="region-detail-card">
            <div class="region-minimap-preview">
              <img src="${curReg.minimap}" alt="${curReg.nameVi}" class="region-minimap-img" />
            </div>
            <h3 class="region-detail-name gold-gradient-text">${curReg.nameVi}</h3>
            <div style="font-size:0.8rem;color:var(--elysia-cyan-glow);margin-bottom:0.75rem;">
              Phân vùng: ${curReg.type} · Cấp độ: Lv.${curReg.levelMin} – ${curReg.levelMax}
            </div>
            <p class="region-detail-desc">${curReg.desc}</p>

            <div style="margin-top:auto;">
              <strong style="font-size:0.8rem;text-transform:uppercase;color:#fff;display:block;margin-bottom:0.5rem;">Quái Vật Bản Địa:</strong>
              <div class="region-monsters-chips">
                ${(curReg.monsters || [])
                  .map(
                    (m: any) => `
                  <div class="monster-chip">
                    <img src="${m.img}" alt="${m.name}" />
                    <span>${m.name} (Lv.${m.level})</span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // ==========================================
  // 3.7 GAMEPLAY PROGRESSION
  // ==========================================
  private renderGameplay(): string {
    return `
      <section class="elysia-section" id="gameplay">
        <div class="section-header">
          <span class="section-pre-title">Hệ Thống Gameplay</span>
          <h2 class="section-title gold-gradient-text">Hành Trình Trở Thành Huyền Thoại</h2>
          <p class="section-desc">Chu trình phát triển toàn diện của một tựa game MMORPG anime kinh điển.</p>
        </div>

        <div class="gameplay-loop-grid">
          <div class="gameplay-card">
            <div class="gameplay-icon-box">✦</div>
            <h4 class="gameplay-card-title">Tạo Nhân Vật Tự Do</h4>
            <p class="gameplay-card-desc">Lựa chọn giới tính Nam/Nữ, chỉ số thuộc tính ngẫu nhiên máy chủ, mở đầu chuyến phiêu lưu.</p>
          </div>

          <div class="gameplay-card">
            <div class="gameplay-icon-box">⚔</div>
            <h4 class="gameplay-card-title">Chiến Đấu &amp; Săn Bắt</h4>
            <p class="gameplay-card-desc">80 chủng loài quái vật đích thực: Thỏ 4 chân, Sói nanh nhọn, Ong bắp cày khổng lồ và Goblin thiện chiến.</p>
          </div>

          <div class="gameplay-card">
            <div class="gameplay-icon-box">🏛</div>
            <h4 class="gameplay-card-title">Thức Tỉnh Nghề Cấp 15</h4>
            <p class="gameplay-card-desc">Vượt Thánh Điện Cổ Đại, Đại Hiền Triết tự động phân loại nghề dựa trên chỉ số tiềm năng chuẩn xác.</p>
          </div>

          <div class="gameplay-card">
            <div class="gameplay-icon-box">⚒</div>
            <h4 class="gameplay-card-title">8 Nghề Đời Sống</h4>
            <p class="gameplay-card-desc">Thu hái Thảo dược, Rèn đúc, Chế tác trang sức, Nấu nướng, Trồng trọt, Câu cá, Đốn củi và Đào khoáng.</p>
          </div>

          <div class="gameplay-card">
            <div class="gameplay-icon-box">⚖</div>
            <h4 class="gameplay-card-title">Chợ Trời Tự Do</h4>
            <p class="gameplay-card-desc">Giao dịch trao đổi trang bị, vật phẩm chế tác và nguyên liệu quý với những người chơi khác trên toàn máy chủ.</p>
          </div>

          <div class="gameplay-card">
            <div class="gameplay-icon-box">👑</div>
            <h4 class="gameplay-card-title">Boss Thế Giới &amp; Phó Bản</h4>
            <p class="gameplay-card-desc">Khiêu chiến Hỏa Long Ignis, Thủy Quái Nguyệt Đầm và Chúa Tể Hư Vô, rinh trang bị Thần Thoại!</p>
          </div>
        </div>
      </section>
    `;
  }

  // ==========================================
  // 3.8 BOSSES GALLERY
  // ==========================================
  private renderBosses(): string {
    return `
      <section class="elysia-section" id="bosses">
        <div class="section-header">
          <span class="section-pre-title">Thử Thách Tối Thượng</span>
          <h2 class="section-title gold-gradient-text">Field &amp; World Bosses</h2>
          <p class="section-desc">Những thực thể cổ đại sở hữu sức mạnh hủy diệt đòi hỏi sự phối hợp đồng đội chuẩn xác.</p>
        </div>

        <div class="boss-grid">
          ${landingData.bosses
            .map(
              (b) => `
            <div class="boss-card">
              <div class="boss-card-banner">
                <img src="${b.sprite}" alt="${b.nameVi}" class="boss-sprite-img" />
              </div>
              <div class="boss-card-body">
                <span class="boss-badge">${b.category} · Lv.${b.level}</span>
                <h4 class="boss-name">${b.nameVi}</h4>
                <p class="boss-desc">${b.desc}</p>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </section>
    `;
  }

  // ==========================================
  // 3.9 EQUIPMENT & RARITY
  // ==========================================
  private renderEquipment(): string {
    return `
      <section class="elysia-section" id="equipment">
        <div class="section-header">
          <span class="section-pre-title">Chiến Lợi Phẩm Quý Hiếm</span>
          <h2 class="section-title gold-gradient-text">Trang Bị &amp; Rarity Tiers</h2>
          <p class="section-desc">Thu thập 10 vị trí trang bị với hệ thống cấp phẩm chuẩn hóa từ Thường đến Thần Thoại.</p>
        </div>

        <div class="equipment-rarity-grid">
          ${landingData.items
            .map(
              (i) => `
            <div class="item-card ${i.rarity}">
              <div class="item-name">${i.name}</div>
              <div class="item-slot">${i.equipSlot || i.category} · Cấp ${i.reqLevel || 1}</div>
              <p class="item-desc">${i.desc || 'Trang bị mang linh lực của thế giới Elysia.'}</p>
            </div>
          `
            )
            .join('')}
        </div>
      </section>
    `;
  }

  // ==========================================
  // 3.10 GALLERY
  // ==========================================
  private renderGallery(): string {
    const galleryItems = [
      { img: '/assets/elysia/landing/hero/hero_keyart.jpg', caption: 'Kinh Đô Elysia & Đại Thánh Đường Hoàng Kim' },
      { img: '/assets/elysia/environment/buildings/cathedral.png', caption: 'Kiến Trúc Đại Thánh Đường 2.5D Isometric' },
      { img: '/assets/elysia/minimaps/THON_KHOI_NGUYEN.png', caption: 'Toàn Cảnh Thôn Khởi Nguyên' },
      { img: '/assets/elysia/landing/classes/swordsman_male.png', caption: 'Kiếm Sĩ (Swordsman) Chiến Binh Cận Chiến' },
      { img: '/assets/elysia/landing/classes/mage_female.png', caption: 'Pháp Sư (Mage) Thao Túng Nguyên Tố' },
      { img: '/assets/elysia/landing/classes/archer_female.png', caption: 'Cung Thủ (Archer) Bắn Tỉa Tầm Xa' },
      { img: '/assets/elysia/monsters/boss_ignis_dragon.png', caption: 'Hỏa Long Ignis – World Boss Cấp 75' },
      { img: '/assets/elysia/monsters/mon_forest_rabbit.png', caption: 'Thỏ Ngọc Linh Rừng Sâu – Quái Vật Bản Địa' },
    ];

    return `
      <section class="elysia-section" id="gallery">
        <div class="section-header">
          <span class="section-pre-title">Kho Lưu Trữ Hình Ảnh</span>
          <h2 class="section-title gold-gradient-text">Thế Giới Elysia Tuyệt Đẹp</h2>
          <p class="section-desc">Chiêm ngưỡng thế giới anime 2.5D rực rỡ và những nét vẽ nghệ thuật tinh xảo.</p>
        </div>

        <div class="gallery-grid">
          ${galleryItems
            .map(
              (g) => `
            <div class="gallery-item" data-lightbox-img="${g.img}" data-lightbox-cap="${g.caption}">
              <img src="${g.img}" alt="${g.caption}" />
              <div class="gallery-overlay">
                <span class="gallery-caption">${g.caption}</span>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </section>
    `;
  }

  // ==========================================
  // 3.11 NEWS & COMMUNITY
  // ==========================================
  private renderNews(): string {
    return `
      <section class="elysia-section" id="news">
        <div class="section-header">
          <span class="section-pre-title">Tin Tức Mới Nhất</span>
          <h2 class="section-title gold-gradient-text">Thông Báo &amp; Cập Nhật</h2>
          <p class="section-desc">Cập nhật nhanh lộ trình phát triển và các sự kiện hấp dẫn trong game.</p>
        </div>

        <div class="news-cards-grid">
          <div class="news-card">
            <span class="news-tag">Bản Cập Nhật 3.0</span>
            <h4 class="news-title">Đại Tu Hình Ảnh Toàn Diện 2.5D</h4>
            <p class="news-snippet">
              Hoàn tất cập nhật 80 chủng loài quái vật độc nhất, 24 hình minh họa nghề nghiệp toàn thân 
              và công trình Đại Thánh Đường mới.
            </p>
          </div>

          <div class="news-card">
            <span class="news-tag">Sự Kiện Mở Máy Chủ</span>
            <h4 class="news-title">Quà Tặng Thám Hiểm Gia Tân Thủ</h4>
            <p class="news-snippet">
              Đăng ký tài khoản ngay hôm nay để nhận bộ trang bị Tân Thủ, 1000 Pha Lê Elysia 
              và Danh Hiệu Độc Nhất vĩnh viễn.
            </p>
          </div>

          <div class="news-card">
            <span class="news-tag">Cộng Đồng</span>
            <h4 class="news-title">Gia Nhập Hội Quán Wibu Elysia</h4>
            <p class="news-snippet">
              Tham gia máy chủ Discord và nhóm Facebook chính thức để kết giao đồng đội, 
              lập Bang Hội và tham gia các giải đấu Boss.
            </p>
          </div>
        </div>
      </section>
    `;
  }

  // ==========================================
  // 3.12 FOOTER
  // ==========================================
  private renderFooter(): string {
    return `
      <footer class="elysia-footer">
        <div class="footer-inner">
          <div class="footer-brand-col">
            <h3 class="gold-gradient-text" style="font-family:var(--elysia-font-title);margin:0;">ELYSIA NO DENSETSU</h3>
            <div class="footer-slogan">BECOME WIBU, SAVE THE WORLDS.</div>
            <p style="margin:0.5rem 0 0 0;line-height:1.6;">
              Dự án MMORPG Web Anime Nhật Bản phát triển bằng công nghệ Phaser 3, Three.js và Socket.IO 
              với hệ thống máy chủ chứng thực tối tân.
            </p>
          </div>

          <div class="footer-nav-col">
            <h4>Khám Phá</h4>
            <a href="#hero">Trang Chủ</a>
            <a href="#classes">8 Chức Nghiệp</a>
            <a href="#skills">Kỹ Năng &amp; VFX</a>
            <a href="#world">Bản Đồ Thế Giới</a>
            <a href="#bosses">Boss Khủng</a>
          </div>

          <div class="footer-nav-col">
            <h4>Cộng Đồng &amp; Mã Nguồn</h4>
            <a href="https://github.com/HoangNhanTNT/ElysaMMO" target="_blank" rel="noopener">GitHub Repository</a>
            <a href="https://discord.gg" target="_blank" rel="noopener">Máy Chủ Discord</a>
            <a href="#news">Điều Khoản Dịch Vụ</a>
            <a href="#news">Chính Sách Bảo Mật</a>
          </div>
        </div>

        <div class="footer-bottom">
          <span>Copyright © 2026 ELYSIA NO DENSETSU Production Committee. All rights reserved.</span>
          <span>Phiên Bản v3.0.0 · Production Ready</span>
        </div>
      </footer>
    `;
  }

  // ==========================================
  // MODALS (SKILL DETAIL & LIGHTBOX)
  // ==========================================
  private renderModals(): string {
    return `
      <div class="landing-modal-backdrop" id="modal-skill-backdrop">
        <div class="landing-modal-dialog" id="modal-skill-dialog">
          <button class="landing-modal-close" id="btn-close-skill-modal">&times;</button>
          <div id="modal-skill-content"></div>
        </div>
      </div>

      <div class="landing-modal-backdrop" id="modal-lightbox-backdrop">
        <div class="landing-modal-dialog" style="max-width:840px;background:#020617;padding:1rem;">
          <button class="landing-modal-close" id="btn-close-lightbox-modal">&times;</button>
          <img id="lightbox-img" src="" alt="" style="width:100%;height:auto;border-radius:8px;max-height:80vh;object-fit:contain;" />
          <div id="lightbox-caption" style="text-align:center;color:#cbd5e1;margin-top:0.75rem;font-weight:600;"></div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // EVENT BINDINGS
  // ==========================================
  private bindEvents() {
    // Header scroll effect
    this.container.addEventListener('scroll', () => {
      const header = this.container.querySelector('#navbar');
      if (this.container.scrollTop > 40) {
        header?.classList.add('scrolled');
      } else {
        header?.classList.remove('scrolled');
      }
    });

    // Mobile menu toggle
    const mobileBtn = document.getElementById('btn-mobile-toggle');
    const navLinks = document.getElementById('nav-links');
    mobileBtn?.addEventListener('click', () => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
      navLinks?.classList.toggle('mobile-open', state.mobileMenuOpen);
    });

    // Close mobile menu on link click
    navLinks?.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        state.mobileMenuOpen = false;
        navLinks.classList.remove('mobile-open');
      });
    });

    // Launch game CTAs
    const triggerPlay = () => {
      if (this.onLaunchGameCallback) {
        this.onLaunchGameCallback();
      } else {
        window.location.search = '?play=1';
      }
    };
    document.getElementById('btn-nav-play')?.addEventListener('click', triggerPlay);
    document.getElementById('btn-hero-play')?.addEventListener('click', triggerPlay);

    // Login CTA
    const triggerLogin = () => {
      if (this.onOpenAuthCallback) {
        this.onOpenAuthCallback('login');
      } else {
        window.location.search = '?action=login';
      }
    };
    document.getElementById('btn-nav-login')?.addEventListener('click', triggerLogin);

    // Hero Gender Toggle
    document.querySelectorAll('[data-hero-gender]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const g = target.getAttribute('data-hero-gender') as 'male' | 'female';
        state.heroGender = g;
        document.querySelectorAll('[data-hero-gender]').forEach((b) => b.classList.remove('active'));
        target.classList.add('active');
        const heroJob = landingData.jobs[state.heroClassIdx];
        const imgEl = document.getElementById('hero-char-img') as HTMLImageElement;
        if (imgEl && heroJob) {
          imgEl.src = g === 'male' ? heroJob.maleImg : heroJob.femaleImg;
        }
      });
    });

    // Class selection
    document.querySelectorAll('[data-class-select]').forEach((el) => {
      el.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const cid = target.getAttribute('data-class-select');
        if (cid) {
          state.activeClassId = cid;
          this.refreshClassPanel();
        }
      });
    });

    // Class Gender Toggle
    document.querySelectorAll('[data-job-gender]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const g = target.getAttribute('data-job-gender') as 'male' | 'female';
        state.classGender = g;
        document.querySelectorAll('[data-job-gender]').forEach((b) => b.classList.remove('active'));
        target.classList.add('active');
        const curJob = landingData.jobs.find((j) => j.id === state.activeClassId);
        const imgEl = document.getElementById('class-main-img') as HTMLImageElement;
        if (imgEl && curJob) {
          imgEl.src = g === 'male' ? curJob.maleImg : curJob.femaleImg;
        }
      });
    });

    // Skill Filter
    document.querySelectorAll('[data-skill-filter]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const f = target.getAttribute('data-skill-filter') || 'all';
        state.activeSkillFilter = f;
        document.querySelectorAll('[data-skill-filter]').forEach((b) => b.classList.remove('active'));
        target.classList.add('active');
        this.refreshSkillsGrid();
      });
    });

    // Open Skill Detail Modal
    this.container.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[data-open-skill]');
      if (target) {
        const sid = target.getAttribute('data-open-skill');
        const sk = landingData.skills.find((s) => s.id === sid);
        if (sk) this.openSkillModal(sk);
      }
    });

    // Region Select
    document.querySelectorAll('[data-region-select]').forEach((el) => {
      el.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const rid = target.getAttribute('data-region-select');
        if (rid) {
          state.activeRegionId = rid;
          this.refreshRegionPanel();
        }
      });
    });

    // Lightbox open
    document.querySelectorAll('[data-lightbox-img]').forEach((el) => {
      el.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const img = target.getAttribute('data-lightbox-img');
        const cap = target.getAttribute('data-lightbox-cap') || '';
        if (img) this.openLightbox(img, cap);
      });
    });

    // Close Modals
    document.getElementById('btn-close-skill-modal')?.addEventListener('click', () => this.closeModals());
    document.getElementById('btn-close-lightbox-modal')?.addEventListener('click', () => this.closeModals());
    document.querySelectorAll('.landing-modal-backdrop').forEach((bg) => {
      bg.addEventListener('click', (e) => {
        if (e.target === bg) this.closeModals();
      });
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModals();
    });
  }

  private refreshClassPanel() {
    const curJob = landingData.jobs.find((j) => j.id === state.activeClassId) || landingData.jobs[0];
    document.querySelectorAll('[data-class-select]').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-class-select') === curJob.id);
    });
    const imgEl = document.getElementById('class-main-img') as HTMLImageElement;
    if (imgEl) imgEl.src = state.classGender === 'male' ? curJob.maleImg : curJob.femaleImg;

    const classSection = document.getElementById('classes');
    if (classSection) {
      const container = classSection.querySelector('.class-showcase-container');
      if (container) {
        const oldPanel = container.querySelector('.class-detail-panel');
        if (oldPanel) {
          const temp = document.createElement('div');
          temp.innerHTML = this.renderClasses();
          const newPanel = temp.querySelector('.class-detail-panel');
          if (newPanel) {
            oldPanel.replaceWith(newPanel);
            // Re-bind gender buttons in new panel
            newPanel.querySelectorAll('[data-job-gender]').forEach((btn) => {
              btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const g = target.getAttribute('data-job-gender') as 'male' | 'female';
                state.classGender = g;
                newPanel.querySelectorAll('[data-job-gender]').forEach((b) => b.classList.remove('active'));
                target.classList.add('active');
                const img = document.getElementById('class-main-img') as HTMLImageElement;
                if (img) img.src = g === 'male' ? curJob.maleImg : curJob.femaleImg;
              });
            });
          }
        }
      }
    }
  }

  private refreshSkillsGrid() {
    const grid = document.querySelector('.skills-cards-grid');
    if (!grid) return;
    const filtered =
      state.activeSkillFilter === 'all'
        ? landingData.skills
        : landingData.skills.filter((s) => s.skillType === state.activeSkillFilter || s.classId === state.activeSkillFilter);

    grid.innerHTML = filtered
      .map(
        (s) => `
      <div class="skill-card" data-open-skill="${s.id}">
        <div class="skill-card-top">
          <div class="skill-thumb-frame">
            <img src="${s.iconUrl}" alt="${s.nameVi}" class="skill-thumb-img" onerror="this.src='/assets/elysia/vfx/vfx_sword_slash_thumb.png'" />
          </div>
          <div class="skill-meta">
            <h4 class="skill-card-name">${s.nameVi}</h4>
            <span class="skill-card-type">${s.skillType} · ${s.element || 'neutral'}</span>
          </div>
        </div>
        <p class="skill-card-desc">${s.desc}</p>
        <div class="skill-card-metrics">
          <span>Hồi chiêu: <strong>${s.cooldown}s</strong></span>
          <span>Tiêu hao: <strong>${s.mpCost} MP</strong></span>
          <span>Yêu cầu: <strong>Lv.${s.reqLevel || 1}</strong></span>
        </div>
      </div>
    `
      )
      .join('');
  }

  private refreshRegionPanel() {
    const curReg = landingData.regions.find((r) => r.id === state.activeRegionId) || landingData.regions[0];
    document.querySelectorAll('[data-region-select]').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-region-select') === curReg.id);
    });

    const card = document.querySelector('.region-detail-card');
    if (card) {
      const img = card.querySelector('.region-minimap-img') as HTMLImageElement;
      if (img) img.src = curReg.minimap;
      const title = card.querySelector('.region-detail-name');
      if (title) title.textContent = curReg.nameVi;
      const desc = card.querySelector('.region-detail-desc');
      if (desc) desc.textContent = curReg.desc;

      const chipsBox = card.querySelector('.region-monsters-chips');
      if (chipsBox) {
        chipsBox.innerHTML = (curReg.monsters || [])
          .map(
            (m: any) => `
          <div class="monster-chip">
            <img src="${m.img}" alt="${m.name}" />
            <span>${m.name} (Lv.${m.level})</span>
          </div>
        `
          )
          .join('');
      }
    }
  }

  private openSkillModal(sk: any) {
    const modal = document.getElementById('modal-skill-backdrop');
    const content = document.getElementById('modal-skill-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:1.25rem;margin-bottom:1.25rem;">
        <div class="skill-thumb-frame" style="width:72px;height:72px;">
          <img src="${sk.iconUrl}" alt="${sk.nameVi}" style="width:100%;height:100%;object-fit:contain;" />
        </div>
        <div>
          <h3 class="gold-gradient-text" style="font-family:var(--elysia-font-title);font-size:1.6rem;margin:0;">${sk.nameVi}</h3>
          <span style="color:var(--elysia-cyan-glow);font-size:0.85rem;text-transform:uppercase;">${sk.classId} · ${sk.skillType}</span>
        </div>
      </div>
      <p style="color:#cbd5e1;line-height:1.6;font-size:0.95rem;margin-bottom:1.5rem;">${sk.desc}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;background:rgba(15,23,42,0.8);padding:1rem;border-radius:8px;border:1px solid var(--elysia-border-subtle);font-size:0.85rem;">
        <div>Nguyên tố: <strong style="color:#fff;">${sk.element || 'Không'}</strong></div>
        <div>Hồi chiêu: <strong style="color:#fff;">${sk.cooldown} giây</strong></div>
        <div>Tiêu hao MP: <strong style="color:#fff;">${sk.mpCost} MP</strong></div>
        <div>Yêu cầu cấp: <strong style="color:#fff;">Lv.${sk.reqLevel || 1}</strong></div>
      </div>
    `;
    modal.classList.add('active');
  }

  private openLightbox(imgUrl: string, caption: string) {
    const modal = document.getElementById('modal-lightbox-backdrop');
    const imgEl = document.getElementById('lightbox-img') as HTMLImageElement;
    const capEl = document.getElementById('lightbox-caption');
    if (!modal || !imgEl || !capEl) return;

    imgEl.src = imgUrl;
    capEl.textContent = caption;
    modal.classList.add('active');
  }

  private closeModals() {
    document.querySelectorAll('.landing-modal-backdrop').forEach((m) => m.classList.remove('active'));
  }

  // ==========================================
  // HERO BACKGROUND PARTICLES
  // ==========================================
  private initHeroParticles() {
    this.particleCanvas = document.getElementById('hero-particles') as HTMLCanvasElement;
    if (!this.particleCanvas) return;
    const ctx = this.particleCanvas.getContext('2d');
    if (!ctx) return;

    let w = (this.particleCanvas.width = this.particleCanvas.offsetWidth);
    let h = (this.particleCanvas.height = this.particleCanvas.offsetHeight);

    window.addEventListener('resize', () => {
      if (this.particleCanvas) {
        w = this.particleCanvas.width = this.particleCanvas.offsetWidth;
        h = this.particleCanvas.height = this.particleCanvas.offsetHeight;
      }
    });

    const particles: Array<{ x: number; y: number; size: number; speedX: number; speedY: number; opacity: number; color: string }> = [];
    const colors = ['#22d3ee', '#38bdf8', '#f59e0b', '#fda4af', '#e0e7ff'];

    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 2.5 + 1,
        speedX: Math.random() * 0.4 - 0.2,
        speedY: -(Math.random() * 0.5 + 0.2),
        opacity: Math.random() * 0.7 + 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.y < 0) p.y = h;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
      this.animFrameId = requestAnimationFrame(animate);
    };

    animate();
  }

  private initScrollReveal() {
    // Smooth scroll for nav anchor links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (!href || href === '#') return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }
}
