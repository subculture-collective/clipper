//go:build integration

package migrations

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

const (
	// PerformanceThresholdUp is the maximum acceptable time for forward migrations in seconds
	PerformanceThresholdUp = 30.0
	// PerformanceThresholdDown is the maximum acceptable time for rollback migrations in seconds
	PerformanceThresholdDown = 30.0
)

// SchemaSnapshot represents a complete snapshot of database schema
type SchemaSnapshot struct {
	Tables      []TableInfo      `json:"tables"`
	Indexes     []IndexInfo      `json:"indexes"`
	Constraints []ConstraintInfo `json:"constraints"`
	Triggers    []TriggerInfo    `json:"triggers"`
	Functions   []FunctionInfo   `json:"functions"`
	Sequences   []SequenceInfo   `json:"sequences"`
}

// TableInfo contains table metadata
type TableInfo struct {
	Name    string       `json:"name"`
	Columns []ColumnInfo `json:"columns"`
}

// ColumnInfo contains column metadata
type ColumnInfo struct {
	Name         string `json:"name"`
	DataType     string `json:"data_type"`
	IsNullable   bool   `json:"is_nullable"`
	DefaultValue string `json:"default_value"`
}

// IndexInfo contains index metadata
type IndexInfo struct {
	Name       string `json:"name"`
	TableName  string `json:"table_name"`
	Definition string `json:"definition"`
}

// ConstraintInfo contains constraint metadata
type ConstraintInfo struct {
	Name           string `json:"name"`
	TableName      string `json:"table_name"`
	ConstraintType string `json:"constraint_type"`
	Definition     string `json:"definition"`
}

// TriggerInfo contains trigger metadata
type TriggerInfo struct {
	Name      string `json:"name"`
	TableName string `json:"table_name"`
	Event     string `json:"event"`
	Timing    string `json:"timing"`
}

// FunctionInfo contains function metadata
type FunctionInfo struct {
	Name       string `json:"name"`
	ReturnType string `json:"return_type"`
	Language   string `json:"language"`
}

// SequenceInfo contains sequence metadata
type SequenceInfo struct {
	Name string `json:"name"`
}

// MigrationPerformance tracks migration timing
type MigrationPerformance struct {
	Direction string        `json:"direction"`
	Steps     int           `json:"steps"`
	Duration  time.Duration `json:"duration"`
	StartTime time.Time     `json:"start_time"`
	EndTime   time.Time     `json:"end_time"`
}

// captureSchemaSnapshot creates a comprehensive snapshot of the database schema
func captureSchemaSnapshot(ctx context.Context, pool *pgxpool.Pool) (*SchemaSnapshot, error) {
	snapshot := &SchemaSnapshot{}

	// Capture tables and columns
	tables, err := captureTables(ctx, pool)
	if err != nil {
		return nil, fmt.Errorf("failed to capture tables: %w", err)
	}
	snapshot.Tables = tables

	// Capture indexes
	indexes, err := captureIndexes(ctx, pool)
	if err != nil {
		return nil, fmt.Errorf("failed to capture indexes: %w", err)
	}
	snapshot.Indexes = indexes

	// Capture constraints
	constraints, err := captureConstraints(ctx, pool)
	if err != nil {
		return nil, fmt.Errorf("failed to capture constraints: %w", err)
	}
	snapshot.Constraints = constraints

	// Capture triggers
	triggers, err := captureTriggers(ctx, pool)
	if err != nil {
		return nil, fmt.Errorf("failed to capture triggers: %w", err)
	}
	snapshot.Triggers = triggers

	// Capture functions
	functions, err := captureFunctions(ctx, pool)
	if err != nil {
		return nil, fmt.Errorf("failed to capture functions: %w", err)
	}
	snapshot.Functions = functions

	// Capture sequences
	sequences, err := captureSequences(ctx, pool)
	if err != nil {
		return nil, fmt.Errorf("failed to capture sequences: %w", err)
	}
	snapshot.Sequences = sequences

	return snapshot, nil
}

// captureTables captures all tables and their columns
func captureTables(ctx context.Context, pool *pgxpool.Pool) ([]TableInfo, error) {
	query := `
		SELECT t.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default
		FROM information_schema.tables t
		LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
		WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
		ORDER BY t.table_name, c.ordinal_position
	`

	rows, err := pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tablesMap := make(map[string]*TableInfo)
	for rows.Next() {
		var tableName, columnName, dataType string
		var isNullable string
		var defaultValue sql.NullString

		err := rows.Scan(&tableName, &columnName, &dataType, &isNullable, &defaultValue)
		if err != nil {
			return nil, err
		}

		if _, exists := tablesMap[tableName]; !exists {
			tablesMap[tableName] = &TableInfo{Name: tableName, Columns: []ColumnInfo{}}
		}

		col := ColumnInfo{
			Name:         columnName,
			DataType:     dataType,
			IsNullable:   isNullable == "YES",
			DefaultValue: defaultValue.String,
		}
		tablesMap[tableName].Columns = append(tablesMap[tableName].Columns, col)
	}

	var tables []TableInfo
	for _, table := range tablesMap {
		tables = append(tables, *table)
	}

	return tables, nil
}

// captureIndexes captures all indexes
func captureIndexes(ctx context.Context, pool *pgxpool.Pool) ([]IndexInfo, error) {
	query := `
		SELECT indexname, tablename, indexdef
		FROM pg_indexes
		WHERE schemaname = 'public'
		ORDER BY tablename, indexname
	`

	rows, err := pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var indexes []IndexInfo
	for rows.Next() {
		var idx IndexInfo
		err := rows.Scan(&idx.Name, &idx.TableName, &idx.Definition)
		if err != nil {
			return nil, err
		}
		indexes = append(indexes, idx)
	}

	return indexes, nil
}

// captureConstraints captures all constraints
func captureConstraints(ctx context.Context, pool *pgxpool.Pool) ([]ConstraintInfo, error) {
	query := `
		SELECT 
			tc.constraint_name,
			tc.table_name,
			tc.constraint_type,
			COALESCE(
				CASE 
					WHEN tc.constraint_type = 'FOREIGN KEY' THEN 
						'FOREIGN KEY (' || kcu.column_name || ') REFERENCES ' || ccu.table_name || '(' || ccu.column_name || ')'
					WHEN tc.constraint_type = 'CHECK' THEN 
						cc.check_clause
					WHEN tc.constraint_type = 'UNIQUE' THEN 
						'UNIQUE (' || kcu.column_name || ')'
					ELSE 'N/A'
				END,
				'N/A'
			) as definition
		FROM information_schema.table_constraints tc
		LEFT JOIN information_schema.key_column_usage kcu 
			ON tc.constraint_name = kcu.constraint_name 
			AND tc.table_schema = kcu.table_schema
		LEFT JOIN information_schema.constraint_column_usage ccu
			ON tc.constraint_name = ccu.constraint_name
			AND tc.table_schema = ccu.table_schema
		LEFT JOIN information_schema.check_constraints cc
			ON tc.constraint_name = cc.constraint_name
		WHERE tc.table_schema = 'public'
		AND tc.constraint_type IN ('FOREIGN KEY', 'CHECK', 'UNIQUE', 'PRIMARY KEY')
		-- Filter out auto-generated NOT NULL constraint names (pattern: schemaoid_tableoid_columnnum_not_null)
		AND NOT (tc.constraint_type = 'CHECK' AND tc.constraint_name ~ '^\d+_\d+_\d+_not_null$')
		ORDER BY tc.table_name, tc.constraint_name
	`

	rows, err := pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var constraints []ConstraintInfo
	for rows.Next() {
		var c ConstraintInfo
		err := rows.Scan(&c.Name, &c.TableName, &c.ConstraintType, &c.Definition)
		if err != nil {
			return nil, err
		}
		constraints = append(constraints, c)
	}

	return constraints, nil
}

// captureTriggers captures all triggers
func captureTriggers(ctx context.Context, pool *pgxpool.Pool) ([]TriggerInfo, error) {
	query := `
		SELECT trigger_name, event_object_table, event_manipulation, action_timing
		FROM information_schema.triggers
		WHERE trigger_schema = 'public'
		ORDER BY event_object_table, trigger_name
	`

	rows, err := pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var triggers []TriggerInfo
	for rows.Next() {
		var t TriggerInfo
		err := rows.Scan(&t.Name, &t.TableName, &t.Event, &t.Timing)
		if err != nil {
			return nil, err
		}
		triggers = append(triggers, t)
	}

	return triggers, nil
}

// captureFunctions captures all user-defined functions
func captureFunctions(ctx context.Context, pool *pgxpool.Pool) ([]FunctionInfo, error) {
	query := `
		SELECT routine_name, data_type, external_language
		FROM information_schema.routines
		WHERE routine_schema = 'public'
		AND routine_type = 'FUNCTION'
		ORDER BY routine_name
	`

	rows, err := pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var functions []FunctionInfo
	for rows.Next() {
		var f FunctionInfo
		err := rows.Scan(&f.Name, &f.ReturnType, &f.Language)
		if err != nil {
			return nil, err
		}
		functions = append(functions, f)
	}

	return functions, nil
}

// captureSequences captures all sequences
func captureSequences(ctx context.Context, pool *pgxpool.Pool) ([]SequenceInfo, error) {
	query := `
		SELECT sequence_name
		FROM information_schema.sequences
		WHERE sequence_schema = 'public'
		ORDER BY sequence_name
	`

	rows, err := pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sequences []SequenceInfo
	for rows.Next() {
		var s SequenceInfo
		err := rows.Scan(&s.Name)
		if err != nil {
			return nil, err
		}
		sequences = append(sequences, s)
	}

	return sequences, nil
}

// compareSchemaSnapshots compares two schema snapshots and returns differences
func compareSchemaSnapshots(before, after *SchemaSnapshot) []string {
	var diffs []string

	// Compare tables
	beforeTables := make(map[string]TableInfo)
	for _, t := range before.Tables {
		beforeTables[t.Name] = t
	}
	afterTables := make(map[string]TableInfo)
	for _, t := range after.Tables {
		afterTables[t.Name] = t
	}

	// Check for new tables
	for name := range afterTables {
		if _, exists := beforeTables[name]; !exists {
			diffs = append(diffs, fmt.Sprintf("New table: %s", name))
		}
	}

	// Check for removed tables
	for name := range beforeTables {
		if _, exists := afterTables[name]; !exists {
			diffs = append(diffs, fmt.Sprintf("Removed table: %s", name))
		}
	}

	// Compare indexes
	beforeIndexes := make(map[string]bool)
	for _, idx := range before.Indexes {
		beforeIndexes[idx.Name] = true
	}
	afterIndexes := make(map[string]bool)
	for _, idx := range after.Indexes {
		afterIndexes[idx.Name] = true
	}

	for name := range afterIndexes {
		if !beforeIndexes[name] {
			diffs = append(diffs, fmt.Sprintf("New index: %s", name))
		}
	}
	for name := range beforeIndexes {
		if !afterIndexes[name] {
			diffs = append(diffs, fmt.Sprintf("Removed index: %s", name))
		}
	}

	// Compare constraints
	beforeConstraints := make(map[string]bool)
	for _, c := range before.Constraints {
		beforeConstraints[c.Name] = true
	}
	afterConstraints := make(map[string]bool)
	for _, c := range after.Constraints {
		afterConstraints[c.Name] = true
	}

	for name := range afterConstraints {
		if !beforeConstraints[name] {
			diffs = append(diffs, fmt.Sprintf("New constraint: %s", name))
		}
	}
	for name := range beforeConstraints {
		if !afterConstraints[name] {
			diffs = append(diffs, fmt.Sprintf("Removed constraint: %s", name))
		}
	}

	// Compare triggers
	beforeTriggers := make(map[string]bool)
	for _, t := range before.Triggers {
		beforeTriggers[t.Name] = true
	}
	afterTriggers := make(map[string]bool)
	for _, t := range after.Triggers {
		afterTriggers[t.Name] = true
	}

	for name := range afterTriggers {
		if !beforeTriggers[name] {
			diffs = append(diffs, fmt.Sprintf("New trigger: %s", name))
		}
	}
	for name := range beforeTriggers {
		if !afterTriggers[name] {
			diffs = append(diffs, fmt.Sprintf("Removed trigger: %s", name))
		}
	}

	// Compare functions
	beforeFunctions := make(map[string]bool)
	for _, f := range before.Functions {
		beforeFunctions[f.Name] = true
	}
	afterFunctions := make(map[string]bool)
	for _, f := range after.Functions {
		afterFunctions[f.Name] = true
	}

	for name := range afterFunctions {
		if !beforeFunctions[name] {
			diffs = append(diffs, fmt.Sprintf("New function: %s", name))
		}
	}
	for name := range beforeFunctions {
		if !afterFunctions[name] {
			diffs = append(diffs, fmt.Sprintf("Removed function: %s", name))
		}
	}

	return diffs
}

// runMigrationWithTiming runs a migration and tracks performance
func runMigrationWithTiming(direction string, steps int) (*MigrationPerformance, error) {
	dbHost := testutil.GetEnv("TEST_DATABASE_HOST", "localhost")
	dbPort := testutil.GetEnv("TEST_DATABASE_PORT", "5437")
	dbUser := testutil.GetEnv("TEST_DATABASE_USER", "clipper")
	dbPassword := testutil.GetEnv("TEST_DATABASE_PASSWORD", "clipper_password")
	dbName := testutil.GetEnv("TEST_DATABASE_NAME", "clipper_test")

	dbURL := fmt.Sprintf(
		"postgresql://%s:%s@%s:%s/%s?sslmode=disable",
		dbUser, dbPassword, dbHost, dbPort, dbName,
	)

	migrationsPath := testutil.GetEnv("TEST_MIGRATIONS_PATH", "../../migrations")

	args := []string{
		"-path", migrationsPath,
		"-database", dbURL,
		direction,
	}

	if steps > 0 {
		args = append(args, fmt.Sprintf("%d", steps))
	}

	perf := &MigrationPerformance{
		Direction: direction,
		Steps:     steps,
		StartTime: time.Now(),
	}

	cmd := exec.Command("migrate", args...)
	output, err := cmd.CombinedOutput()
	
	perf.EndTime = time.Now()
	perf.Duration = perf.EndTime.Sub(perf.StartTime)

	if err != nil {
		sanitizedURL := fmt.Sprintf(
			"postgresql://%s:***@%s:%s/%s?sslmode=disable",
			dbUser, dbHost, dbPort, dbName,
		)
		return perf, fmt.Errorf("migration failed (db: %s): %v, output: %s", sanitizedURL, err, string(output))
	}

	return perf, nil
}

// savePerformanceBaseline saves performance data to a file
func savePerformanceBaseline(t *testing.T, perf *MigrationPerformance) {
	reportDir := filepath.Join("test-reports", "migration-drills")
	err := os.MkdirAll(reportDir, 0755)
	require.NoError(t, err, "Failed to create report directory")

	filename := filepath.Join(reportDir, fmt.Sprintf("perf-%s-%s.json", 
		perf.Direction, time.Now().Format("20060102-150405")))

	data, err := json.MarshalIndent(perf, "", "  ")
	require.NoError(t, err, "Failed to marshal performance data")

	err = os.WriteFile(filename, data, 0644)
	require.NoError(t, err, "Failed to write performance report")

	t.Logf("Performance baseline saved to: %s", filename)
	t.Logf("Migration %s (%d steps) took: %v", perf.Direction, perf.Steps, perf.Duration)
}

// TestShadowDatabaseMigrationDrills runs comprehensive migration rollback drills
func TestShadowDatabaseMigrationDrills(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping shadow database drills in short mode")
	}

	mh := setupMigrationTest(t)
	ctx := context.Background()

	t.Run("FullMigrationCycle", func(t *testing.T) {
		// Step 1: Capture initial schema snapshot
		t.Log("Capturing initial schema snapshot...")
		initialSnapshot, err := captureSchemaSnapshot(ctx, mh.pool)
		require.NoError(t, err, "Failed to capture initial snapshot")

		// Save initial snapshot for debugging
		reportDir := filepath.Join("test-reports", "migration-drills")
		err = os.MkdirAll(reportDir, 0755)
		require.NoError(t, err)

		initialData, _ := json.MarshalIndent(initialSnapshot, "", "  ")
		_ = os.WriteFile(filepath.Join(reportDir, "initial-snapshot.json"), initialData, 0644)

		// Step 2: Get current migration version
		var currentVersion int
		var dirty bool
		err = mh.pool.QueryRow(ctx, "SELECT version, dirty FROM schema_migrations").Scan(&currentVersion, &dirty)
		require.NoError(t, err, "Failed to get current migration version")
		require.False(t, dirty, "Database should not be in dirty state")
		t.Logf("Current migration version: %d", currentVersion)

		// Step 3: Roll back one migration to test the cycle
		if currentVersion <= 1 {
			t.Skip("Cannot roll back from initial migration")
		}

		// Step 4: Run down migration with performance tracking
		t.Log("Running down migration...")
		downPerf, err := runMigrationWithTiming("down", 1)
		require.NoError(t, err, "Down migration should succeed")
		savePerformanceBaseline(t, downPerf)

		// Verify performance threshold
		assert.LessOrEqual(t, downPerf.Duration.Seconds(), PerformanceThresholdDown,
			"Down migration exceeded performance threshold (%v > %v)",
			downPerf.Duration, time.Duration(PerformanceThresholdDown)*time.Second)

		// Step 5: Capture schema after rollback
		t.Log("Capturing post-rollback schema snapshot...")
		afterRollbackSnapshot, err := captureSchemaSnapshot(ctx, mh.pool)
		require.NoError(t, err, "Failed to capture post-rollback snapshot")

		afterRollbackData, _ := json.MarshalIndent(afterRollbackSnapshot, "", "  ")
		_ = os.WriteFile(filepath.Join(reportDir, "after-rollback-snapshot.json"), afterRollbackData, 0644)

		// Step 6: Re-apply migration with performance tracking
		t.Log("Re-applying migration...")
		upPerf, err := runMigrationWithTiming("up", 1)
		require.NoError(t, err, "Up migration should succeed")
		savePerformanceBaseline(t, upPerf)

		// Verify performance threshold
		assert.LessOrEqual(t, upPerf.Duration.Seconds(), PerformanceThresholdUp,
			"Up migration exceeded performance threshold (%v > %v)",
			upPerf.Duration, time.Duration(PerformanceThresholdUp)*time.Second)

		// Step 7: Capture final schema snapshot
		t.Log("Capturing final schema snapshot...")
		finalSnapshot, err := captureSchemaSnapshot(ctx, mh.pool)
		require.NoError(t, err, "Failed to capture final snapshot")

		finalData, _ := json.MarshalIndent(finalSnapshot, "", "  ")
		_ = os.WriteFile(filepath.Join(reportDir, "final-snapshot.json"), finalData, 0644)

		// Step 8: Compare initial and final snapshots - they should match
		t.Log("Comparing initial and final snapshots...")
		diffs := compareSchemaSnapshots(initialSnapshot, finalSnapshot)
		
		if len(diffs) > 0 {
			t.Logf("Schema differences detected after rollback cycle:")
			for _, diff := range diffs {
				t.Logf("  - %s", diff)
			}
		}

		assert.Empty(t, diffs, "Schema should match after complete migration cycle (forward + rollback + forward)")

		// Step 9: Verify database is not dirty
		err = mh.pool.QueryRow(ctx, "SELECT dirty FROM schema_migrations").Scan(&dirty)
		require.NoError(t, err)
		assert.False(t, dirty, "Database should not be dirty after migration cycle")

		t.Log("✓ Full migration cycle completed successfully")
	})

	t.Run("IntegrityValidation", func(t *testing.T) {
		t.Run("ReferentialIntegrity", func(t *testing.T) {
			// Check that all foreign keys are valid
			var invalidFKCount int
			query := `
				SELECT COUNT(*)
				FROM information_schema.table_constraints tc
				WHERE tc.constraint_type = 'FOREIGN KEY'
				AND tc.table_schema = 'public'
				AND NOT EXISTS (
					SELECT 1 FROM information_schema.referential_constraints rc
					WHERE rc.constraint_name = tc.constraint_name
					AND rc.constraint_schema = tc.constraint_schema
				)
			`
			err := mh.pool.QueryRow(ctx, query).Scan(&invalidFKCount)
			require.NoError(t, err)
			assert.Equal(t, 0, invalidFKCount, "All foreign key constraints should be valid")
		})

		t.Run("IndexIntegrity", func(t *testing.T) {
			// Check for orphaned indexes
			var orphanedIndexCount int
			query := `
				SELECT COUNT(*) 
				FROM pg_indexes i
				WHERE i.schemaname = 'public'
				AND NOT EXISTS (
					SELECT 1 FROM pg_tables t 
					WHERE t.tablename = i.tablename AND t.schemaname = i.schemaname
				)
				AND NOT EXISTS (
					SELECT 1 FROM pg_matviews m
					WHERE m.matviewname = i.tablename AND m.schemaname = i.schemaname
				)
			`
			err := mh.pool.QueryRow(ctx, query).Scan(&orphanedIndexCount)
			require.NoError(t, err)
			assert.Equal(t, 0, orphanedIndexCount, "Should have no orphaned indexes")
		})

		t.Run("ConstraintIntegrity", func(t *testing.T) {
			// Check for orphaned constraints
			var orphanedConstraintCount int
			query := `
				SELECT COUNT(*)
				FROM information_schema.table_constraints tc
				LEFT JOIN information_schema.tables t 
					ON tc.table_name = t.table_name 
					AND tc.table_schema = t.table_schema
				WHERE tc.table_schema = 'public'
				AND t.table_name IS NULL
			`
			err := mh.pool.QueryRow(ctx, query).Scan(&orphanedConstraintCount)
			require.NoError(t, err)
			assert.Equal(t, 0, orphanedConstraintCount, "Should have no orphaned constraints")
		})

		t.Run("TriggerIntegrity", func(t *testing.T) {
			// Check for orphaned triggers
			var orphanedTriggerCount int
			query := `
				SELECT COUNT(*)
				FROM pg_trigger t
				LEFT JOIN pg_class c ON t.tgrelid = c.oid
				WHERE c.oid IS NULL
			`
			err := mh.pool.QueryRow(ctx, query).Scan(&orphanedTriggerCount)
			require.NoError(t, err)
			assert.Equal(t, 0, orphanedTriggerCount, "Should have no orphaned triggers")
		})

		t.Run("DataCorruptionCheck", func(t *testing.T) {
			// Insert test fixture and verify integrity
			testUserID := uuid.New()
			
			// Insert test user
			_, err := mh.pool.Exec(ctx, `
				INSERT INTO users (id, username, twitch_id, email, role)
				VALUES ($1, $2, $3, $4, 'user')
			`, testUserID, "test_rollback_user", "test_twitch_123", "test@example.com")
			require.NoError(t, err, "Should be able to insert test user")

			// Verify we can read it back
			var username string
			err = mh.pool.QueryRow(ctx, "SELECT username FROM users WHERE id = $1", testUserID).Scan(&username)
			require.NoError(t, err, "Should be able to read test user")
			assert.Equal(t, "test_rollback_user", username, "Username should match")

			// Clean up
			_, err = mh.pool.Exec(ctx, "DELETE FROM users WHERE id = $1", testUserID)
			require.NoError(t, err, "Should be able to delete test user")
		})

		t.Log("✓ All integrity checks passed")
	})

	t.Run("PerformanceBaseline", func(t *testing.T) {
		// This test documents the current performance baselines
		t.Logf("Migration Performance Thresholds:")
		t.Logf("  - Forward migrations (up): %v seconds", PerformanceThresholdUp)
		t.Logf("  - Backward migrations (down): %v seconds", PerformanceThresholdDown)
		t.Logf("")
		t.Logf("Performance reports are saved to: test-reports/migration-drills/")
		t.Logf("")
		t.Logf("To update thresholds, modify constants in shadow_db_drills_test.go:")
		t.Logf("  - PerformanceThresholdUp")
		t.Logf("  - PerformanceThresholdDown")
	})
}

// TestMigrationDriftDetection tests for schema drift
func TestMigrationDriftDetection(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping drift detection in short mode")
	}

	mh := setupMigrationTest(t)
	ctx := context.Background()

	t.Run("DetectUnexpectedChanges", func(t *testing.T) {
		// Capture baseline schema
		baselineSnapshot, err := captureSchemaSnapshot(ctx, mh.pool)
		require.NoError(t, err)

		// Simulate a manual change (drift)
		_, err = mh.pool.Exec(ctx, `
			CREATE TABLE IF NOT EXISTS drift_test_table (
				id uuid PRIMARY KEY,
				created_at timestamp NOT NULL DEFAULT NOW()
			)
		`)
		require.NoError(t, err)

		// Capture snapshot after drift
		driftSnapshot, err := captureSchemaSnapshot(ctx, mh.pool)
		require.NoError(t, err)

		// Compare snapshots
		diffs := compareSchemaSnapshots(baselineSnapshot, driftSnapshot)
		
		// We expect to see the drift_test_table
		assert.NotEmpty(t, diffs, "Should detect schema drift")
		
		foundDrift := false
		for _, diff := range diffs {
			if strings.Contains(diff, "drift_test_table") {
				foundDrift = true
				t.Logf("✓ Detected drift: %s", diff)
			}
		}
		assert.True(t, foundDrift, "Should detect the drift_test_table")

		// Clean up
		_, err = mh.pool.Exec(ctx, "DROP TABLE IF EXISTS drift_test_table")
		require.NoError(t, err)
	})
}

// TestResidualObjectsDetection tests for objects left after rollback
func TestResidualObjectsDetection(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping residual objects test in short mode")
	}

	mh := setupMigrationTest(t)
	ctx := context.Background()

	t.Run("NoResidualTablesAfterRollback", func(t *testing.T) {
		// Get current version
		var currentVersion int
		var dirty bool
		err := mh.pool.QueryRow(ctx, "SELECT version, dirty FROM schema_migrations").Scan(&currentVersion, &dirty)
		require.NoError(t, err)
		require.False(t, dirty)

		if currentVersion <= 1 {
			t.Skip("Cannot test rollback from initial migration")
		}

		// Capture before rollback
		beforeSnapshot, err := captureSchemaSnapshot(ctx, mh.pool)
		require.NoError(t, err)

		// Rollback
		_, err = runMigrationWithTiming("down", 1)
		require.NoError(t, err)

		// Capture after rollback
		afterRollbackSnapshot, err := captureSchemaSnapshot(ctx, mh.pool)
		require.NoError(t, err)

		// Re-apply
		_, err = runMigrationWithTiming("up", 1)
		require.NoError(t, err)

		// Capture final
		finalSnapshot, err := captureSchemaSnapshot(ctx, mh.pool)
		require.NoError(t, err)

		// Compare: final should match before
		diffs := compareSchemaSnapshots(beforeSnapshot, finalSnapshot)
		
		if len(diffs) > 0 {
			t.Logf("Residual objects detected:")
			for _, diff := range diffs {
				t.Logf("  - %s", diff)
			}
		}

		assert.Empty(t, diffs, "No residual objects should remain after rollback cycle")

		// Also verify the rollback actually removed something
		rollbackDiffs := compareSchemaSnapshots(afterRollbackSnapshot, beforeSnapshot)
		if len(rollbackDiffs) == 0 {
			t.Log("Warning: Rollback did not appear to remove any objects - migration may be a no-op")
		} else {
			t.Logf("Rollback successfully removed/modified %d objects", len(rollbackDiffs))
		}
	})
}
