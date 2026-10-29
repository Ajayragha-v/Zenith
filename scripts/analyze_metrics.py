import ast
import sys
import json

class ComplexityVisitor(ast.NodeVisitor):
    def __init__(self):
        self.cc = 1
        self.nesting = 0
        self.max_nesting = 0

    def generic_visit(self, node):
        # Only count branch statements, NOT boolean operators (matching Ruff)
        if isinstance(node, (ast.If, ast.For, ast.While, ast.Try)):
            self.cc += 1
            self.nesting += 1
            self.max_nesting = max(self.max_nesting, self.nesting)
            super().generic_visit(node)
            self.nesting -= 1
        else:
            super().generic_visit(node)

if __name__ == "__main__":
    file_path = sys.argv[1]
    try:
        with open(file_path, 'r') as f:
            code = f.read()
        tree = ast.parse(code)
        visitor = ComplexityVisitor()
        visitor.visit(tree)
        print(json.dumps({"cc": visitor.cc, "max_nesting": visitor.max_nesting}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))