import ast
import sys

class ComplexityReducer(ast.NodeTransformer):
    def __init__(self):
        self.changed = False
        self.counter = 0

    # Helper to check if a block of code ALWAYS returns
    def ends_with_return(self, nodes):
        if not nodes: return False
        last = nodes[-1]
        if isinstance(last, (ast.Return, ast.Raise, ast.Continue, ast.Break)):
            return True
        if isinstance(last, ast.If):
            return self.ends_with_return(last.body) and self.ends_with_return(last.orelse)
        return False

    def visit_If(self, node):
        self.generic_visit(node)
        
        # ---------------------------------------------------------
        # RULE 2: GUARD CLAUSES (Deep Flattening)
        # ---------------------------------------------------------
        if node.orelse and self.ends_with_return(node.body):
            # Invert the condition
            new_test = ast.UnaryOp(op=ast.Not(), operand=node.test)
            ast.copy_location(new_test, node.test)
            
            # Create the early return block
            new_if = ast.If(
                test=new_test,
                body=node.orelse,
                orelse=[]
            )
            ast.copy_location(new_if, node)
            
            self.changed = True
            # Return the new guard clause + the original body (flattened)
            return [new_if] + node.body

        # ---------------------------------------------------------
        # RULE 3: BOOLEAN EXTRACTION
        # ---------------------------------------------------------
        if isinstance(node.test, ast.BoolOp) and len(node.test.values) >= 3:
            var_name = f"_is_valid_{self.counter}"
            self.counter += 1
            
            assign = ast.Assign(
                targets=[ast.Name(id=var_name, ctx=ast.Store())],
                value=node.test
            )
            ast.copy_location(assign, node)
            ast.copy_location(assign.targets[0], node)
            
            node.test = ast.Name(id=var_name, ctx=ast.Load())
            ast.copy_location(node.test, node)
            
            self.changed = True
            return [assign, node]

        # ---------------------------------------------------------
        # RULE 1: SAFE FLATTENING
        # ---------------------------------------------------------
        if not node.orelse and len(node.body) == 1 and isinstance(node.body[0], ast.If):
            inner_if = node.body[0]
            if not inner_if.orelse:
                combined_test = ast.BoolOp(
                    op=ast.And(),
                    values=[node.test, inner_if.test]
                )
                ast.copy_location(combined_test, node.test)
                new_if = ast.If(
                    test=combined_test,
                    body=inner_if.body,
                    orelse=[]
                )
                ast.copy_location(new_if, node)
                self.changed = True
                return new_if
                
        return node

if __name__ == "__main__":
    file_path = sys.argv[1]
    with open(file_path, 'r') as f:
        source = f.read()
    try:
        tree = ast.parse(source)
        reducer = ComplexityReducer()
        new_tree = reducer.visit(tree)
        
        if not reducer.changed:
            sys.exit(0) # No changes
            
        ast.fix_missing_locations(new_tree)
        with open(file_path, 'w') as f:
            f.write(ast.unparse(new_tree))
    except Exception as e:
        sys.stderr.write(str(e))
        sys.exit(1)