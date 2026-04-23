window.PrimeOSDashboard = {
	init(config) {
		this.setActiveNav(config.module);
		this.initTabs();
		this.initTable(config.table);
		this.initRefresh(config.refresh);
		this.updateTimestamp(config.timestampId);
	},

	setActiveNav(module) {
		const links = document.querySelectorAll(".sidebar-link[data-module]");
		links.forEach((link) => {
			link.classList.toggle("active", link.dataset.module === module);
		});
	},

	initTabs() {
		const tabs = document.querySelectorAll(".tab[data-tab]");
		if (!tabs.length) return;

		tabs.forEach((tab) => {
			tab.addEventListener("click", () => {
				const tabGroup = tab.closest("[data-tab-group]");
				if (!tabGroup) return;

				const tabName = tab.dataset.tab;
				const groupName = tabGroup.dataset.tabGroup;

				tabGroup.querySelectorAll(".tab").forEach((item) => {
					item.classList.toggle("active", item === tab);
				});

				document.querySelectorAll(`[data-tab-panel='${groupName}']`).forEach((panel) => {
					panel.style.display = panel.dataset.tabName === tabName ? "block" : "none";
				});
			});
		});
	},

	initTable(tableConfig) {
		if (!tableConfig) return;

		const {
			tableBodyId,
			searchInputId,
			statusFilterId,
			extraFilters = [],
			paginationId,
			pageSize = 6,
			emptyStateId,
			totalCountId,
		} = tableConfig;

		const tableBody = document.getElementById(tableBodyId);
		if (!tableBody) return;

		const rows = Array.from(tableBody.querySelectorAll("tr"));
		const searchInput = searchInputId ? document.getElementById(searchInputId) : null;
		const statusFilter = statusFilterId ? document.getElementById(statusFilterId) : null;
		const extraFilterElements = extraFilters
			.map((filter) => ({ ...filter, el: document.getElementById(filter.id) }))
			.filter((filter) => filter.el);
		const pagination = paginationId ? document.getElementById(paginationId) : null;
		const emptyState = emptyStateId ? document.getElementById(emptyStateId) : null;
		const totalCount = totalCountId ? document.getElementById(totalCountId) : null;

		let currentPage = 1;
		let filteredRows = rows;

		const applyFilters = () => {
			const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
			const status = statusFilter ? statusFilter.value : "all";

			filteredRows = rows.filter((row) => {
				const rowText = row.textContent.toLowerCase();
				const rowStatus = row.dataset.status || "";

				if (query && !rowText.includes(query)) return false;
				if (status !== "all" && rowStatus !== status) return false;

				for (const filter of extraFilterElements) {
					const value = filter.el.value;
					if (value === "all") continue;
					const rowValue = row.dataset[filter.attr] || "";
					if (rowValue !== value) return false;
				}

				return true;
			});

			currentPage = 1;
			render();
		};

		const render = () => {
			rows.forEach((row) => {
				row.style.display = "none";
			});

			const start = (currentPage - 1) * pageSize;
			const end = start + pageSize;
			const pageRows = filteredRows.slice(start, end);

			pageRows.forEach((row) => {
				row.style.display = "table-row";
			});

			if (emptyState) {
				emptyState.style.display = filteredRows.length ? "none" : "block";
			}

			if (totalCount) {
				totalCount.textContent = String(filteredRows.length);
			}

			renderPagination();
		};

		const renderPagination = () => {
			if (!pagination) return;

			const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
			if (currentPage > pageCount) currentPage = pageCount;

			pagination.innerHTML = "";

			const createButton = (label, page, disabled = false, active = false) => {
				const button = document.createElement("button");
				button.type = "button";
				button.className = `pagination-btn${active ? " active" : ""}`;
				button.textContent = label;
				button.disabled = disabled;
				button.addEventListener("click", () => {
					currentPage = page;
					render();
				});
				return button;
			};

			pagination.appendChild(createButton("‹", Math.max(1, currentPage - 1), currentPage === 1));

			for (let page = 1; page <= pageCount; page += 1) {
				pagination.appendChild(createButton(String(page), page, false, page === currentPage));
			}

			pagination.appendChild(createButton("›", Math.min(pageCount, currentPage + 1), currentPage === pageCount));
		};

		if (searchInput) searchInput.addEventListener("input", applyFilters);
		if (statusFilter) statusFilter.addEventListener("change", applyFilters);
		extraFilterElements.forEach((filter) => {
			filter.el.addEventListener("change", applyFilters);
		});

		render();
	},

	initRefresh(refreshConfig) {
		if (!refreshConfig) return;

		const { buttonId, overlayId, timestampId, delay = 700 } = refreshConfig;
		const button = document.getElementById(buttonId);
		if (!button) return;

		button.addEventListener("click", () => {
			const overlay = overlayId ? document.getElementById(overlayId) : null;
			if (overlay) overlay.style.display = "flex";

			button.disabled = true;
			setTimeout(() => {
				if (overlay) overlay.style.display = "none";
				button.disabled = false;
				this.updateTimestamp(timestampId);
			}, delay);
		});
	},

	updateTimestamp(elementId) {
		if (!elementId) return;
		const element = document.getElementById(elementId);
		if (!element) return;

		const now = new Date();
		const hh = String(now.getHours()).padStart(2, "0");
		const mm = String(now.getMinutes()).padStart(2, "0");
		const ss = String(now.getSeconds()).padStart(2, "0");
		element.textContent = `${hh}:${mm}:${ss}`;
	},
};
