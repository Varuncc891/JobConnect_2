import React, { useContext, useEffect, useState } from "react";
import API from "../../utils/api";
import { Link, useNavigate } from "react-router-dom";
import { Context } from "../../main";
import { Job } from "../../types";

interface JobsResponse {
  jobs: Job[];
  pagination: {
    totalPages: number;
    totalJobs: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
}

const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [sortBy, setSortBy] = useState("newest");
  const [appliedFilters, setAppliedFilters] = useState({ category: "", city: "", minSalary: "" });
  const [draftFilters, setDraftFilters] = useState({ category: "", city: "", minSalary: "" });
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);

  const { isAuthorized } = useContext(Context);
  const navigateTo = useNavigate();

  useEffect(() => {
    if (!isAuthorized) navigateTo("/");
  }, [isAuthorized, navigateTo]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const { data } = await API.get<JobsResponse>(`/job/getall?limit=1000`);
        const uniqueCategories = [...new Set(data.jobs.map((job) => job.category))];
        setCategoryOptions(uniqueCategories.filter((cat): cat is string => cat !== undefined));
        const uniqueCities = [...new Set(data.jobs.map((job) => job.city))];
        setCityOptions(uniqueCities.filter((city): city is string => city !== undefined));
      } catch {
        setCategoryOptions(["Tech", "Finance", "Marketing", "Design"]);
        setCityOptions(["Bangalore", "Mumbai", "Delhi", "Pune"]);
      }
    };
    if (isAuthorized) fetchFilterOptions();
  }, [isAuthorized]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", limit.toString());
      params.append("sortBy", sortBy);
      if (appliedFilters.category) params.append("category", appliedFilters.category);
      if (appliedFilters.city) params.append("city", appliedFilters.city);
      if (appliedFilters.minSalary) params.append("minSalary", appliedFilters.minSalary);

      window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);

      const { data } = await API.get(`/job/getall?${params.toString()}`);
      setJobs(data.jobs);
      setTotalPages(data.pagination.totalPages);
      setTotalJobs(data.pagination.totalJobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) fetchJobs();
  }, [currentPage, limit, sortBy, appliedFilters, isAuthorized]);

  const applyFilters = () => { setAppliedFilters(draftFilters); setCurrentPage(1); };
  const clearFilters = () => {
    setDraftFilters({ category: "", city: "", minSalary: "" });
    setAppliedFilters({ category: "", city: "", minSalary: "" });
    setSortBy("newest");
    setCurrentPage(1);
  };
  const goToPage = (page: number) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); };

  if (!isAuthorized) return null;

  return (
    <section className="jobs page">
      <div className="container">
        <h2>ALL AVAILABLE JOBS</h2>
        <div className="content-wrapper">
          <aside className="filters-sidebar">
            <h3>Filters</h3>
            <div className="filter-group">
              <label>Category</label>
              <select value={draftFilters.category} onChange={(e) => setDraftFilters({ ...draftFilters, category: e.target.value })}>
                <option value="">All Categories</option>
                {categoryOptions.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>City</label>
              <select value={draftFilters.city} onChange={(e) => setDraftFilters({ ...draftFilters, city: e.target.value })}>
                <option value="">All Cities</option>
                {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>Minimum Salary (₹)</label>
              <input type="number" placeholder="Enter amount" value={draftFilters.minSalary} onChange={(e) => setDraftFilters({ ...draftFilters, minSalary: e.target.value })} />
            </div>
            <div className="filter-actions">
              <button onClick={applyFilters} className="apply-btn">Apply Filters</button>
              <button onClick={clearFilters} className="clear-btn">Clear All</button>
            </div>
            {(appliedFilters.category || appliedFilters.city || appliedFilters.minSalary) && (
              <div className="active-filters">
                <h4>Active Filters:</h4>
                {appliedFilters.category && <p>📁 {appliedFilters.category}</p>}
                {appliedFilters.city && <p>📍 {appliedFilters.city}</p>}
                {appliedFilters.minSalary && <p>💰 Min: ₹{appliedFilters.minSalary}</p>}
              </div>
            )}
          </aside>

          <main className="jobs-content">
            <div className="results-header">
              <div className="results-info">
                Showing {jobs.length} of {totalJobs} jobs
                {(appliedFilters.category || appliedFilters.city || appliedFilters.minSalary) && (
                  <span className="filtered-badge">Filtered</span>
                )}
              </div>
              <div className="controls">
                <div className="show-pages">
                  <span>Show Pages</span>
                  <select value={limit} onChange={(e) => { setCurrentPage(1); setLimit(Number(e.target.value)); }}>
                    <option value="10">10 per page</option>
                    <option value="20">20 per page</option>
                    <option value="50">50 per page</option>
                  </select>
                </div>
                <select value={sortBy} onChange={(e) => { setCurrentPage(1); setSortBy(e.target.value); }}>
                  <option value="newest">🆕 Newest First</option>
                  <option value="oldest">📅 Oldest First</option>
                  <option value="salary-high">💰 Salary: High to Low</option>
                  <option value="salary-low">💰 Salary: Low to High</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="loading">Loading jobs...</div>
            ) : (
              <>
                <div className="banner">
                  {jobs.length > 0 ? (
                    jobs.map((element) => (
                      <div className="card" key={element._id}>
                        <h4>{element.title}</h4>
                        <p className="category">📁 {element.category}</p>
                        <p className="location">📍 {element.city}, {element.country}</p>
                        <p className="salary">
                          💰 {element.fixedSalary
                            ? `₹${element.fixedSalary.toLocaleString()}`
                            : `₹${element.salaryFrom?.toLocaleString()} - ₹${element.salaryTo?.toLocaleString()}`}
                        </p>
                        <Link to={`/job/${element._id}`} className="details-btn">View Details →</Link>
                      </div>
                    ))
                  ) : (
                    <p className="no-jobs">No jobs found matching your criteria.</p>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="pagination">
                    <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>← Previous</button>
                    <div className="page-numbers">
                      {[...Array(totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)) {
                          return <button key={pageNum} onClick={() => goToPage(pageNum)} className={pageNum === currentPage ? "active" : ""}>{pageNum}</button>;
                        } else if (pageNum === currentPage - 3 || pageNum === currentPage + 3) {
                          return <span key={pageNum}>...</span>;
                        }
                        return null;
                      })}
                    </div>
                    <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>Next →</button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </section>
  );
};

export default Jobs;