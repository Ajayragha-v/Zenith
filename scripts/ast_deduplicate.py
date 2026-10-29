import ast
import sys

class SafeDeduplicator(ast.NodeTransformer):
    def __init__(self, source_code):
        self.changed = False
        self.dup_to_canon = {} 
        self.seen_fingerprints = {} 
        self.functions_to_delete = set()
        self.source_code = source_code

    def get_fingerprint(self, node):
        # Includes arguments and body structure to ensure 100% identical signatures
        return ast.dump(node.args) + "".join(ast.dump(n) for n in node.body)

    def process_scope(self, body, scope_name=""):
        for child in body:
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                fp = self.get_fingerprint(child)
                scope_fp = f"{scope_name}::{fp}"
                
                if scope_fp in self.seen_fingerprints:
                    canon = self.seen_fingerprints[scope_fp]
                    self.dup_to_canon[child.name] = canon
                    self.functions_to_delete.add(child.name)
                else:
                    self.seen_fingerprints[scope_fp] = child.name

    def visit_Module(self, node):
        # Step 1 & 2: Find duplicates in global scope and classes
        self.process_scope(node.body, "global")
        for child in node.body:
            if isinstance(child, ast.ClassDef):
                self.process_scope(child.body, child.name)
        
        self.generic_visit(node)
        
        # Step 6: Remove duplicates (with dynamic reference safety check)
        new_body = []
        for child in node.body:
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)) and child.name in self.functions_to_delete:
                # Safety check: Do not delete if it's referenced as a string (e.g., getattr)
                if f'"{child.name}"' in self.source_code or f"'{child.name}'" in self.source_code:
                    print(f"   [AST] Skipping {child.name}: Dynamic string reference found.", file=sys.stderr)
                    new_body.append(child)
                else:
                    self.changed = True
            else:
                new_body.append(child)
        node.body = new_body
        return node

    def visit_Call(self, node):
        self.generic_visit(node)
        # Step 4: Redirect dependencies
        if isinstance(node.func, ast.Name) and node.func.id in self.dup_to_canon:
            node.func.id = self.dup_to_canon[node.func.id]
            self.changed = True
        return node

if __name__ == "__main__":
    file_path = sys.argv[1]
    with open(file_path, 'r') as f:
        source = f.read()
    try:
        tree = ast.parse(source)
        deduplicator = SafeDeduplicator(source)
        new_tree = deduplicator.visit(tree)
        
        if not deduplicator.changed:
            sys.exit(0) # No safe duplicates found
            
        ast.fix_missing_locations(new_tree)
        with open(file_path, 'w') as f:
            f.write(ast.unparse(new_tree))
            
        print("   [AST] Deduplication applied.", file=sys.stderr)
    except Exception as e:
        sys.stderr.write(str(e))
        sys.exit(1)